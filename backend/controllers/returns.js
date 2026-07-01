const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

const getReturnSettings = async () => {
  const result = await pool.query(`SELECT * FROM return_settings LIMIT 1`);
  if (!result.rows[0]) {
    await pool.query(`
      INSERT INTO return_settings (
        return_window_days,
        require_receipt,
        no_receipt_action,
        manager_approval_threshold,
        max_returns_per_customer,
        allow_opened_items,
        allow_used_items,
        require_condition_check,
        allow_cash_refund,
        allow_card_refund,
        allow_mobile_refund,
        allow_store_credit,
        default_refund_method,
        notify_manager,
        high_value_notification
      ) VALUES (
        30, TRUE, 'store_credit', 500, 5,
        FALSE, FALSE, TRUE,
        TRUE, TRUE, TRUE, TRUE,
        'cash', TRUE, 500
      )
    `);
    const newResult = await pool.query(`SELECT * FROM return_settings LIMIT 1`);
    return newResult.rows[0];
  }
  return result.rows[0];
};

const formatCurrency = (amount) => {
  return `M ${parseFloat(amount || 0).toFixed(2)}`;
};

const create = async (req, res) => {
  const {
    original_transaction_id,
    customer_id,
    items,
    refund_method,
    reason,
    notes
  } = req.body;

  if (!original_transaction_id) {
    return res.status(400).json({
      success: false,
      message: 'Please provide the original transaction receipt number.'
    });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please select at least one item to return.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get return settings
    const settings = await getReturnSettings();

    // Get original transaction
    const txResult = await client.query(
      `SELECT t.*, c.full_name, c.phone 
       FROM transactions t
       LEFT JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.transaction_id = $1 AND t.status = 'completed'`,
      [original_transaction_id]
    );

    if (!txResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Original transaction not found. Please check the receipt number and try again.'
      });
    }

    const transaction = txResult.rows[0];

    // Check if return already exists for this transaction
    const existingReturn = await client.query(
      `SELECT return_id FROM returns WHERE original_transaction_id = $1`,
      [original_transaction_id]
    );

    if (existingReturn.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A return has already been processed for this transaction. Only one return is allowed per transaction.'
      });
    }

    // Check return period
    const transactionDate = new Date(transaction.transaction_date);
    const today = new Date();
    const daysDiff = Math.floor((today - transactionDate) / (1000 * 60 * 60 * 24));

    if (settings.return_window_days > 0 && daysDiff > settings.return_window_days) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `This transaction is ${daysDiff} days old. Returns are only accepted within ${settings.return_window_days} days of purchase.`
      });
    }

    // Process each return item
    let totalRefund = 0;
    const processedItems = [];

    for (const item of items) {
      const txItemResult = await client.query(
        `SELECT ti.*, p.name, p.stock_quantity 
         FROM transaction_items ti
         JOIN products p ON ti.product_id = p.product_id
         WHERE ti.item_id = $1 AND ti.transaction_id = $2`,
        [item.item_id, original_transaction_id]
      );

      if (!txItemResult.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Item not found in the original transaction. Please check and try again.`
        });
      }

      const txItem = txItemResult.rows[0];
      const returnQty = parseFloat(item.quantity) || 0;

      if (returnQty > parseFloat(txItem.quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Cannot return ${returnQty} units. Only ${txItem.quantity} units were purchased.`
        });
      }

      // Check if item already returned
      const returnedCheck = await client.query(
        `SELECT SUM(quantity) as returned_qty 
         FROM return_items 
         WHERE original_transaction_item_id = $1`,
        [item.item_id]
      );

      const alreadyReturned = parseFloat(returnedCheck.rows[0]?.returned_qty || 0);
      if (alreadyReturned + returnQty > parseFloat(txItem.quantity)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `This item has already been returned. Only ${txItem.quantity - alreadyReturned} units available for return.`
        });
      }

      const refundPrice = parseFloat(txItem.unit_price) || 0;
      const itemTotal = refundPrice * returnQty;
      totalRefund += itemTotal;

      processedItems.push({
        ...txItem,
        return_qty: returnQty,
        refund_price: refundPrice,
        item_total: itemTotal
      });
    }

    // Check manager approval threshold
    if (settings.manager_approval_threshold > 0 && totalRefund > settings.manager_approval_threshold) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `This refund amount (${formatCurrency(totalRefund)}) exceeds the manager approval threshold of ${formatCurrency(settings.manager_approval_threshold)}. Please contact a manager to process this return.`
      });
    }

    // Check refund method
    if (refund_method) {
      const methodMap = {
        'cash': 'allow_cash_refund',
        'card': 'allow_card_refund',
        'mobile': 'allow_mobile_refund',
        'store_credit': 'allow_store_credit'
      };
      const settingKey = methodMap[refund_method];
      if (settingKey && !settings[settingKey]) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `${refund_method.charAt(0).toUpperCase() + refund_method.slice(1)} refunds are not allowed. Please choose another refund method.`
        });
      }
    }

    // Check max returns per customer per month
    if (settings.max_returns_per_customer > 0 && customer_id) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const customerReturns = await client.query(
        `SELECT COUNT(*) as return_count 
         FROM returns 
         WHERE customer_id = $1 
         AND created_at >= $2`,
        [customer_id, monthStart]
      );

      const returnCount = parseInt(customerReturns.rows[0]?.return_count || 0);
      if (returnCount >= settings.max_returns_per_customer) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `This customer has reached the maximum of ${settings.max_returns_per_customer} returns allowed per month.`
        });
      }
    }

    // Generate return receipt number
    const counterResult = await client.query(
      `INSERT INTO receipt_counter (counter_date, last_number)
       VALUES (CURRENT_DATE, 1)
       ON CONFLICT (counter_date)
       DO UPDATE SET last_number = receipt_counter.last_number + 1
       RETURNING last_number`,
      []
    );

    const counter = counterResult.rows[0].last_number;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const returnReceiptNumber = 'RTN-' + dateStr + '-' + String(counter).padStart(4, '0');

    // Apply restocking fee if applicable
    let finalRefund = totalRefund;
    if (settings.restocking_fee_percentage > 0) {
      const restockingFee = totalRefund * (settings.restocking_fee_percentage / 100);
      finalRefund = totalRefund - restockingFee;
    }

    // Create return record
    const returnResult = await client.query(
      `INSERT INTO returns (
        original_transaction_id,
        return_receipt_number,
        cashier_id,
        cashier_name,
        customer_id,
        customer_phone,
        refund_amount,
        refund_method,
        reason,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed') RETURNING *`,
      [
        original_transaction_id,
        returnReceiptNumber,
        req.user.user_id,
        req.user.full_name,
        customer_id || transaction.customer_id || null,
        transaction.phone || null,
        finalRefund.toFixed(2),
        refund_method || 'cash',
        reason || 'Customer return',
        notes || null
      ]
    );

    const returnRecord = returnResult.rows[0];

    // Create return items and update stock
    for (const item of processedItems) {
      await client.query(
        `INSERT INTO return_items (
          return_id,
          original_transaction_item_id,
          product_id,
          quantity,
          refund_price,
          total_amount,
          reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          returnRecord.return_id,
          item.item_id,
          item.product_id,
          item.return_qty,
          item.refund_price.toFixed(2),
          item.item_total.toFixed(2),
          reason || 'Customer return'
        ]
      );

      // Update stock - add returned quantity back
      await client.query(
        `UPDATE products 
         SET stock_quantity = stock_quantity + $1, updated_at = NOW()
         WHERE product_id = $2`,
        [item.return_qty, item.product_id]
      );

      // Log stock movement
      await client.query(
        `INSERT INTO stock_movements (
          product_id, movement_type, quantity, notes, performed_by
        ) VALUES ($1, 'return_in', $2, $3, $4)`,
        [
          item.product_id,
          item.return_qty,
          `Return from transaction ${original_transaction_id}`,
          req.user.user_id
        ]
      );
    }

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'RETURN',
      action_details: `Return processed for transaction ${original_transaction_id} — Amount: M ${finalRefund.toFixed(2)}`,
      affected_table: 'returns',
      affected_record_id: returnRecord.return_id
    });

    return res.status(201).json({
      success: true,
      message: `Return processed successfully. Refund amount: M ${finalRefund.toFixed(2)}${settings.restocking_fee_percentage > 0 ? ` (Restocking fee: ${settings.restocking_fee_percentage}%)` : ''}`,
      return: returnRecord,
      items: processedItems,
      refund_total: finalRefund,
      restocking_fee: totalRefund - finalRefund,
      return_receipt: returnReceiptNumber,
      settings: {
        return_window_days: settings.return_window_days,
        restocking_fee_percentage: settings.restocking_fee_percentage
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[returns/create]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process return. Please try again or contact support.'
    });
  } finally {
    client.release();
  }
};

const getByTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const result = await pool.query(
      `SELECT r.*, u.full_name AS processed_by_name,
              (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.return_id) AS item_count
       FROM returns r
       LEFT JOIN users u ON r.cashier_id = u.user_id
       WHERE r.original_transaction_id = $1
       ORDER BY r.created_at DESC`,
      [transactionId]
    );

    return res.json({
      success: true,
      returns: result.rows
    });

  } catch (err) {
    console.error('[returns/getByTransaction]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load return history. Please try again later.'
    });
  }
};

const getById = async (req, res) => {
  try {
    const returnId = req.params.id;

    const returnResult = await pool.query(
      `SELECT r.*, u.full_name AS processed_by_name,
              t.receipt_number AS original_receipt,
              c.full_name AS customer_name
       FROM returns r
       LEFT JOIN users u ON r.cashier_id = u.user_id
       LEFT JOIN transactions t ON r.original_transaction_id = t.transaction_id
       LEFT JOIN customers c ON r.customer_id = c.customer_id
       WHERE r.return_id = $1`,
      [returnId]
    );

    if (!returnResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Return not found. Please check and try again.'
      });
    }

    const items = await pool.query(
      `SELECT ri.*, p.name AS product_name, p.sku
       FROM return_items ri
       JOIN products p ON ri.product_id = p.product_id
       WHERE ri.return_id = $1`,
      [returnId]
    );

    return res.json({
      success: true,
      return: returnResult.rows[0],
      items: items.rows
    });

  } catch (err) {
    console.error('[returns/getById]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load return details. Please try again later.'
    });
  }
};

const getByCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;

    const result = await pool.query(
      `SELECT r.*, t.receipt_number AS original_receipt,
              (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.return_id) AS item_count
       FROM returns r
       JOIN transactions t ON r.original_transaction_id = t.transaction_id
       WHERE r.customer_id = $1
       ORDER BY r.created_at DESC`,
      [customerId]
    );

    return res.json({
      success: true,
      returns: result.rows
    });

  } catch (err) {
    console.error('[returns/getByCustomer]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load customer return history. Please try again later.'
    });
  }
};

const getAll = async (req, res) => {
  const { date_from, date_to, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let q = `
      SELECT r.*, t.receipt_number AS original_receipt,
             c.full_name AS customer_name,
             u.full_name AS processed_by_name,
             (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.return_id) AS item_count
      FROM returns r
      LEFT JOIN transactions t ON r.original_transaction_id = t.transaction_id
      LEFT JOIN customers c ON r.customer_id = c.customer_id
      LEFT JOIN users u ON r.cashier_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    if (date_from) {
      params.push(date_from);
      q += ` AND DATE(r.created_at) >= $${params.length}`;
    }
    if (date_to) {
      params.push(date_to);
      q += ` AND DATE(r.created_at) <= $${params.length}`;
    }

    q += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(q, params);

    return res.json({
      success: true,
      returns: result.rows,
      count: result.rowCount
    });

  } catch (err) {
    console.error('[returns/getAll]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load returns. Please try again later.'
    });
  }
};

module.exports = {
  create,
  getByTransaction,
  getById,
  getByCustomer,
  getAll
};