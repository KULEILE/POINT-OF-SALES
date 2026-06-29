const pool = require('../config/db');
const { auditLog, paginate } = require('../utils/helpers');

const create = async (req, res) => {
  const {
    items,
    payment_method,
    customer_id,
    customer_phone,
    amount_paid,
    deposit_amount,
    duration_days,
    notes,
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ success: false, message: 'Cart is empty.' });
  }
  if (!payment_method) {
    return res.status(400).json({ success: false, message: 'Payment method is required.' });
  }

  // Credit and layby require a customer
  if ((payment_method === 'credit' || payment_method === 'layby') && !customer_id) {
    return res.status(400).json({
      success: false,
      message: `A customer account is required for ${payment_method} sales.`,
    });
  }

  // Duration validation for credit and layby
  if ((payment_method === 'credit' || payment_method === 'layby') && !duration_days) {
    return res.status(400).json({
      success: false,
      message: 'Please enter the payment duration in days.',
    });
  }

  const duration = parseInt(duration_days) || 30;
  if (duration <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Duration must be greater than 0 days.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Stock validation and expiry check
    for (const item of items) {
      const stockCheck = await client.query(
        `SELECT stock_quantity, name, expiry_date FROM products WHERE product_id = $1`,
        [item.product_id]
      );
      if (!stockCheck.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `Product not found: ${item.product_id}` });
      }
      
      const product = stockCheck.rows[0];
      const available = parseFloat(product.stock_quantity) || 0;
      const requested = parseFloat(item.quantity) || 0;
      
      // Check if product is expired
      if (product.expiry_date) {
        const expiry = new Date(product.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiry < today) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Cannot sell "${product.name}". This product expired on ${new Date(product.expiry_date).toLocaleDateString()}. Please remove it from stock.`
          });
        }
      }
      
      if (requested > available) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${available}, Requested: ${requested}`,
        });
      }
    }

    // Calculate totals
    let subtotal = 0, total_tax = 0;
    for (const item of items) {
      const base = parseFloat(item.unit_price) * parseFloat(item.quantity);
      const discounted = base * (1 - (parseFloat(item.discount_applied) || 0) / 100);
      const tax = item.tax_exempt ? 0 : discounted * (parseFloat(item.tax_rate) || 15) / 100;
      subtotal += discounted;
      total_tax += tax;
    }
    const total_amount = subtotal + total_tax;

    // Credit limit validation
    if (payment_method === 'credit' && customer_id) {
      const custCheck = await client.query(
        `SELECT full_name, credit_limit, current_balance FROM customers WHERE customer_id = $1`,
        [customer_id]
      );
      if (custCheck.rows[0]) {
        const available_credit =
          parseFloat(custCheck.rows[0].credit_limit || 0) -
          parseFloat(custCheck.rows[0].current_balance || 0);
        if (total_amount > available_credit) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Credit limit exceeded for ${custCheck.rows[0].full_name}. Available credit: M ${available_credit.toFixed(2)}, Sale total: M ${total_amount.toFixed(2)}`,
          });
        }
      }
    }

    // Calculate amounts per payment type
    const deposit = parseFloat(deposit_amount) || 0;
    const change_amount =
      payment_method === 'cash'
        ? Math.max(0, (parseFloat(amount_paid) || 0) - total_amount)
        : 0;
    const balance_due =
      payment_method === 'credit' ? total_amount
      : payment_method === 'layby' ? Math.max(0, total_amount - deposit)
      : 0;
    const paid_amount =
      payment_method === 'credit' ? 0
      : payment_method === 'layby' ? deposit
      : parseFloat(amount_paid) || total_amount;
    const pay_status = balance_due > 0 ? 'pending' : 'paid';
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + duration);

    // Insert transaction with duration and due_date
    const txResult = await client.query(
      `INSERT INTO transactions (
        receipt_number, customer_id, customer_phone, is_guest,
        cashier_id, cashier_name,
        payment_method, transaction_type,
        subtotal, tax_amount, tax_rate, total_amount,
        amount_paid, change_amount, balance_due,
        payment_status, status, notes,
        duration_days, due_date
      ) VALUES (
        'PENDING', $1, $2, $3,
        $4, $5,
        $6, $7,
        $8, $9, 15, $10,
        $11, $12, $13,
        $14, 'completed', $15,
        $16, $17
      ) RETURNING *`,
      [
        customer_id || null,
        customer_phone || null,
        !customer_id,
        req.user.user_id,
        req.user.full_name,
        payment_method,
        payment_method,
        subtotal.toFixed(2),
        total_tax.toFixed(2),
        total_amount.toFixed(2),
        paid_amount.toFixed(2),
        change_amount.toFixed(2),
        balance_due.toFixed(2),
        pay_status,
        notes || null,
        duration,
        due_date.toISOString().split('T')[0],
      ]
    );
    const tx = txResult.rows[0];

    // Insert transaction items (stock deducted by DB trigger)
    for (const item of items) {
      await client.query(
        `INSERT INTO transaction_items (
          transaction_id, product_id, quantity, unit_type,
          unit_price, cost_at_sale, discount_applied,
          tax_rate, tax_exempt, total_price
        ) VALUES (
          $1, $2, $3, $4,
          $5, (SELECT cost_price FROM products WHERE product_id = $2),
          $6, $7, $8, $9
        )`,
        [
          tx.transaction_id,
          item.product_id,
          item.quantity,
          item.unit_type || 'piece',
          item.unit_price,
          item.discount_applied || 0,
          item.tax_rate || 15,
          item.tax_exempt || false,
          (parseFloat(item.unit_price) * parseFloat(item.quantity)).toFixed(2),
        ]
      );
    }

    // Handle credit sale
    if (payment_method === 'credit' && customer_id) {
      const cust = await client.query(
        `SELECT current_balance FROM customers WHERE customer_id = $1`,
        [customer_id]
      );
      const prev = parseFloat(cust.rows[0]?.current_balance || 0);
      const next = prev + total_amount;

      await client.query(
        `INSERT INTO credit_transactions (
          customer_id, transaction_id, transaction_type,
          amount, previous_balance, new_balance,
          due_date, created_by
        ) VALUES ($1, $2, 'credit_sale', $3, $4, $5, $6, $7)`,
        [
          customer_id,
          tx.transaction_id,
          total_amount.toFixed(2),
          prev.toFixed(2),
          next.toFixed(2),
          due_date.toISOString().split('T')[0],
          req.user.user_id
        ]
      );

      await client.query(
        `UPDATE customers SET current_balance = $1, updated_at = NOW() WHERE customer_id = $2`,
        [next.toFixed(2), customer_id]
      );
    }

    // Handle lay-by sale
    if (payment_method === 'layby' && customer_id) {

      // Record the deposit as first layby payment
      if (deposit > 0) {
        await client.query(
          `INSERT INTO layby_payments (
            transaction_id, amount_paid, payment_method,
            balance_before, balance_after, received_by, notes
          ) VALUES ($1, $2, 'cash', $3, $4, $5, 'Initial deposit')`,
          [
            tx.transaction_id,
            deposit.toFixed(2),
            total_amount.toFixed(2),
            balance_due.toFixed(2),
            req.user.user_id,
          ]
        );
      }

      // Update customer balance with remaining lay-by amount
      if (balance_due > 0) {
        const cust = await client.query(
          `SELECT current_balance FROM customers WHERE customer_id = $1`,
          [customer_id]
        );
        const prev = parseFloat(cust.rows[0]?.current_balance || 0);
        const next = prev + balance_due;

        await client.query(
          `UPDATE customers SET current_balance = $1, updated_at = NOW() WHERE customer_id = $2`,
          [next.toFixed(2), customer_id]
        );

        // Record in credit_transactions as layby for tracking
        await client.query(
          `INSERT INTO credit_transactions (
            customer_id, transaction_id, transaction_type,
            amount, previous_balance, new_balance, created_by
          ) VALUES ($1, $2, 'credit_sale', $3, $4, $5, $6)`,
          [customer_id, tx.transaction_id, balance_due.toFixed(2), prev.toFixed(2), next.toFixed(2), req.user.user_id]
        );
      }
    }

    await client.query('COMMIT');

    // Audit log
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'SALE',
      action_details: `${payment_method.toUpperCase()} sale — M ${total_amount.toFixed(2)} — Receipt: ${tx.receipt_number} — Duration: ${duration} days`,
      affected_table: 'transactions',
      affected_record_id: tx.transaction_id,
    });

    // Fetch final transaction with generated receipt number
    const final = await client.query(
      `SELECT * FROM transactions WHERE transaction_id = $1`,
      [tx.transaction_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Sale processed successfully.',
      transaction: final.rows[0],
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sales/create]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to process sale.' });
  } finally {
    client.release();
  }
};

const getAll = async (req, res) => {
  const { date_from, date_to, cashier_id, payment_method, status, page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);

  try {
    let q = `
      SELECT t.transaction_id, t.receipt_number, t.transaction_date,
             t.payment_method, t.total_amount, t.status, t.payment_status,
             t.cashier_name, t.customer_phone, t.is_guest,
             t.duration_days, t.due_date
      FROM transactions t WHERE 1=1`;
    const params = [];

    if (date_from) { params.push(date_from); q += ` AND DATE(t.transaction_date) >= $${params.length}`; }
    if (date_to) { params.push(date_to); q += ` AND DATE(t.transaction_date) <= $${params.length}`; }
    if (cashier_id) { params.push(cashier_id); q += ` AND t.cashier_id = $${params.length}`; }
    if (payment_method) { params.push(payment_method); q += ` AND t.payment_method = $${params.length}`; }
    if (status) { params.push(status); q += ` AND t.status = $${params.length}`; }

    q += ` ORDER BY t.transaction_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(lim, offset);

    const result = await pool.query(q, params);
    return res.json({ success: true, sales: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[sales/getAll]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales.' });
  }
};

const getById = async (req, res) => {
  try {
    const tx = await pool.query(
      `SELECT t.*, u.full_name AS cashier_full
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.user_id
       WHERE t.transaction_id = $1`,
      [req.params.id]
    );
    if (!tx.rows[0]) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }
    const items = await pool.query(
      `SELECT ti.*, p.name AS product_name, p.barcode
       FROM transaction_items ti
       JOIN products p ON ti.product_id = p.product_id
       WHERE ti.transaction_id = $1`,
      [req.params.id]
    );
    return res.json({ success: true, transaction: tx.rows[0], items: items.rows });
  } catch (err) {
    console.error('[sales/getById]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const todaySummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::INT AS transaction_count,
         COALESCE(SUM(total_amount), 0) AS total_sales,
         COALESCE(SUM(tax_amount), 0) AS total_tax,
         COALESCE(AVG(total_amount), 0) AS avg_transaction,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) AS cash_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) AS card_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) AS mobile_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'credit' THEN total_amount ELSE 0 END), 0) AS credit_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'layby' THEN total_amount ELSE 0 END), 0) AS layby_sales
       FROM transactions
       WHERE DATE(transaction_date) = CURRENT_DATE AND status = 'completed'`
    );
    return res.json({ success: true, summary: result.rows[0] });
  } catch (err) {
    console.error('[sales/todaySummary]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { create, getAll, getById, todaySummary };