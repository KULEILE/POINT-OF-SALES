const pool = require('../config/db');
const { auditLog, paginate } = require('../utils/helpers');

const getWholesaleSettings = async () => {
  const result = await pool.query(`SELECT * FROM wholesale_settings LIMIT 1`);
  return result.rows[0] || { min_wholesale_quantity: 10, enable_tiered_discounts: false, default_discount_percentage: 0 };
};

const getDiscountTiers = async () => {
  const result = await pool.query(`
    SELECT * FROM discount_tiers 
    WHERE is_active = TRUE 
    ORDER BY min_quantity ASC
  `);
  return result.rows;
};

const calculateWholesalePrice = (product, quantity, settings, tiers) => {
  let unitPrice = parseFloat(product.wholesale_price) || parseFloat(product.selling_price);
  let discount = 0;
  
  if (settings.enable_tiered_discounts && tiers && tiers.length > 0) {
    for (const tier of tiers) {
      const minQty = parseInt(tier.min_quantity);
      const maxQty = tier.max_quantity ? parseInt(tier.max_quantity) : Infinity;
      if (quantity >= minQty && quantity <= maxQty) {
        discount = parseFloat(tier.discount_percentage) || 0;
        break;
      }
    }
  } else {
    discount = parseFloat(settings.default_discount_percentage) || 0;
  }
  
  const discountedPrice = unitPrice * (1 - discount / 100);
  return { unitPrice, discount, discountedPrice };
};

const formatCurrency = (amount) => {
  return `M ${parseFloat(amount || 0).toFixed(2)}`;
};

// ============================================================
// PROMOTION FUNCTIONS
// ============================================================

const getActivePromotions = async (customer_id = null) => {
  let query = `
    SELECT p.* FROM promotions p
    WHERE p.is_active = TRUE
    AND NOW() BETWEEN p.start_date AND p.end_date
  `;
  const params = [];

  if (customer_id) {
    query += `
      AND (
        p.applies_to = 'all'
        OR EXISTS (
          SELECT 1 FROM promotion_customers pc 
          WHERE pc.promotion_id = p.promotion_id 
          AND pc.customer_id = $1
        )
      )
    `;
    params.push(customer_id);
  } else {
    query += ` AND p.applies_to = 'all'`;
  }

  query += ` ORDER BY p.discount_value DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const applyBestPromotion = (items, promotions) => {
  let bestPromotion = null;
  let bestDiscount = 0;

  // Calculate subtotal from items (before any discounts)
  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.unit_price) || parseFloat(item.selling_price) || 0;
    const qty = parseFloat(item.quantity) || 0;
    return sum + (price * qty);
  }, 0);

  for (const promo of promotions) {
    // Check minimum purchase against subtotal
    const minPurchase = parseFloat(promo.min_purchase) || 0;
    if (minPurchase > 0 && subtotal < minPurchase) {
      continue;
    }

    let discount = 0;
    if (promo.promotion_type === 'percentage') {
      discount = subtotal * (parseFloat(promo.discount_value) / 100);
    } else if (promo.promotion_type === 'fixed') {
      discount = parseFloat(promo.discount_value);
    }

    // Cap discount at total
    discount = Math.min(discount, subtotal);

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestPromotion = promo;
    }
  }

  return { promotion: bestPromotion, discount: bestDiscount, subtotal };
};

// ============================================================
// CREATE SALE
// ============================================================

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
    customer_type,
    is_wholesale,
    wholesale_discount,
    payment_splits
  } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ 
      success: false, 
      message: 'Your cart is empty. Please add items before processing the sale.' 
    });
  }
  if (!payment_method) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please select a payment method before processing the sale.' 
    });
  }

  const isWholesale = is_wholesale || false;
  const finalCustomerType = customer_type || (isWholesale ? 'wholesale' : 'retail');

  if ((payment_method === 'credit' || payment_method === 'layby') && !customer_id) {
    return res.status(400).json({
      success: false,
      message: `A customer account is required for ${payment_method} sales. Please select a customer first.`,
    });
  }

  if ((payment_method === 'credit' || payment_method === 'layby') && !duration_days) {
    return res.status(400).json({
      success: false,
      message: 'Please enter the payment duration in days before completing the sale.',
    });
  }

  const duration = parseInt(duration_days) || 30;
  if (duration <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Duration must be greater than 0 days. Please select a valid duration.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const settings = await getWholesaleSettings();
    const tiers = await getDiscountTiers();

    let subtotal = 0, total_tax = 0;
    const processedItems = [];

    for (const item of items) {
      const stockCheck = await client.query(
        `SELECT stock_quantity, name, expiry_date, selling_price, wholesale_price FROM products WHERE product_id = $1`,
        [item.product_id]
      );
      
      if (!stockCheck.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          success: false, 
          message: `Product not found. Please refresh the page and try again.` 
        });
      }
      
      const product = stockCheck.rows[0];
      const available = parseFloat(product.stock_quantity) || 0;
      const requested = parseFloat(item.quantity) || 0;
      
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
          message: `Insufficient stock for "${product.name}". Only ${available} units available, but you requested ${requested} units.`,
        });
      }

      let unitPrice = parseFloat(item.unit_price) || parseFloat(product.selling_price);
      let discountApplied = parseFloat(item.discount_applied) || 0;

      if (isWholesale && product.wholesale_price) {
        const wholesaleResult = calculateWholesalePrice(product, requested, settings, tiers);
        unitPrice = wholesaleResult.discountedPrice;
        discountApplied = wholesaleResult.discount;
      }

      const base = unitPrice * requested;
      const discounted = base * (1 - (discountApplied || 0) / 100);
      const tax = item.tax_exempt ? 0 : discounted * (parseFloat(item.tax_rate) || 15) / 100;
      
      subtotal += discounted;
      total_tax += tax;

      processedItems.push({
        ...item,
        unit_price: unitPrice,
        discount_applied: discountApplied
      });
    }

    const total_amount = subtotal + total_tax;

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
            message: `Credit limit exceeded for ${custCheck.rows[0].full_name}. Available credit is ${formatCurrency(available_credit)}, but the sale total is ${formatCurrency(total_amount)}.`,
          });
        }
      }
    }

    // ============================================================
    // CHECK AND APPLY PROMOTIONS
    // ============================================================
    
    let appliedPromotion = null;
    let appliedDiscount = 0;

    // Get active promotions
    const promotions = await getActivePromotions(customer_id || null);
    
    // Calculate subtotal before any discounts
    const subtotalBeforePromo = processedItems.reduce((sum, item) => {
      const price = parseFloat(item.unit_price) || parseFloat(item.selling_price) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);

    // Apply best promotion using items (not total_amount)
    if (promotions.length > 0) {
      const result = applyBestPromotion(processedItems, promotions);
      appliedPromotion = result.promotion;
      appliedDiscount = result.discount;
    }

    // Calculate final total after promotion - SUBTRACT the discount
    const finalTotal = Math.max(0, total_amount - appliedDiscount);
    
    // Recalculate tax based on discounted total
    const taxRate = 15;
    const taxOnDiscounted = finalTotal * (taxRate / 100);

    const deposit = parseFloat(deposit_amount) || 0;
    const change_amount =
      payment_method === 'cash'
        ? Math.max(0, (parseFloat(amount_paid) || 0) - finalTotal)
        : 0;
    const balance_due =
      payment_method === 'credit' ? finalTotal
      : payment_method === 'layby' ? Math.max(0, finalTotal - deposit)
      : 0;
    const paid_amount =
      payment_method === 'credit' ? 0
      : payment_method === 'layby' ? deposit
      : parseFloat(amount_paid) || finalTotal;
    const pay_status = balance_due > 0 ? 'pending' : 'paid';
    const due_date = new Date();
    due_date.setDate(due_date.getDate() + duration);

    const transactionType = payment_method;

    const txResult = await client.query(
      `INSERT INTO transactions (
        receipt_number, customer_id, customer_phone, is_guest,
        cashier_id, cashier_name,
        payment_method, transaction_type,
        subtotal, tax_amount, tax_rate, total_amount,
        amount_paid, change_amount, balance_due,
        payment_status, status, notes,
        duration_days, due_date, customer_type,
        promotion_id, discount_amount
      ) VALUES (
        'PENDING', $1, $2, $3,
        $4, $5,
        $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14,
        $15, 'completed', $16,
        $17, $18, $19,
        $20, $21
      ) RETURNING *`,
      [
        customer_id || null,
        customer_phone || null,
        !customer_id,
        req.user.user_id,
        req.user.full_name,
        payment_method,
        transactionType,
        subtotal.toFixed(2),
        taxOnDiscounted.toFixed(2),
        taxRate,
        finalTotal.toFixed(2),
        paid_amount.toFixed(2),
        change_amount.toFixed(2),
        balance_due.toFixed(2),
        pay_status,
        notes || null,
        duration,
        due_date.toISOString().split('T')[0],
        finalCustomerType,
        appliedPromotion ? appliedPromotion.promotion_id : null,
        appliedDiscount.toFixed(2)
      ]
    );
    const tx = txResult.rows[0];

    // Record promotion usage
    if (appliedPromotion && appliedDiscount > 0) {
      await client.query(
        `INSERT INTO promotion_usage (promotion_id, transaction_id, discount_amount)
         VALUES ($1, $2, $3)`,
        [appliedPromotion.promotion_id, tx.transaction_id, appliedDiscount.toFixed(2)]
      );
    }

    for (const item of processedItems) {
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

    if (payment_splits && Array.isArray(payment_splits) && payment_splits.length > 0) {
      for (const split of payment_splits) {
        await client.query(
          `INSERT INTO payment_splits (transaction_id, payment_method, amount, reference)
           VALUES ($1, $2, $3, $4)`,
          [tx.transaction_id, split.payment_method, parseFloat(split.amount).toFixed(2), split.reference || null]
        );
      }
    }

    if (payment_method === 'credit' && customer_id) {
      const cust = await client.query(
        `SELECT current_balance FROM customers WHERE customer_id = $1`,
        [customer_id]
      );
      const prev = parseFloat(cust.rows[0]?.current_balance || 0);
      const next = prev + finalTotal;

      await client.query(
        `INSERT INTO credit_transactions (
          customer_id, transaction_id, transaction_type,
          amount, previous_balance, new_balance,
          due_date, created_by
        ) VALUES ($1, $2, 'credit_sale', $3, $4, $5, $6, $7)`,
        [
          customer_id,
          tx.transaction_id,
          finalTotal.toFixed(2),
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

    if (payment_method === 'layby' && customer_id) {
      if (deposit > 0) {
        await client.query(
          `INSERT INTO layby_payments (
            transaction_id, amount_paid, payment_method,
            balance_before, balance_after, received_by, notes
          ) VALUES ($1, $2, 'cash', $3, $4, $5, 'Initial deposit')`,
          [
            tx.transaction_id,
            deposit.toFixed(2),
            finalTotal.toFixed(2),
            balance_due.toFixed(2),
            req.user.user_id,
          ]
        );
      }

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

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'SALE',
      action_details: `${payment_method.toUpperCase()} ${finalCustomerType.toUpperCase()} sale — M ${finalTotal.toFixed(2)} — Receipt: ${tx.receipt_number}${appliedPromotion ? ` — Promotion: ${appliedPromotion.name} (${formatCurrency(appliedDiscount)})` : ''}`,
      affected_table: 'transactions',
      affected_record_id: tx.transaction_id,
    });

    const final = await client.query(
      `SELECT * FROM transactions WHERE transaction_id = $1`,
      [tx.transaction_id]
    );

    const splits = await client.query(
      `SELECT * FROM payment_splits WHERE transaction_id = $1`,
      [tx.transaction_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Sale processed successfully.',
      transaction: final.rows[0],
      payment_splits: splits.rows,
      promotion_applied: appliedPromotion,
      discount_amount: appliedDiscount
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sales/create]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process sale. Please try again or contact support.' 
    });
  } finally {
    client.release();
  }
};

// ============================================================
// GET ALL SALES
// ============================================================

const getAll = async (req, res) => {
  const { date_from, date_to, cashier_id, payment_method, status, customer_type, search, page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);

  try {
    let q = `
      SELECT t.transaction_id, t.receipt_number, t.transaction_date,
             t.payment_method, t.total_amount, t.status, t.payment_status,
             t.cashier_name, t.customer_phone, t.is_guest,
             t.duration_days, t.due_date, t.customer_type,
             t.discount_amount,
             c.full_name AS customer_name,
             p.name AS promotion_name,
             (SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.transaction_id) AS item_count
      FROM transactions t
      LEFT JOIN customers c ON t.customer_id = c.customer_id
      LEFT JOIN promotions p ON t.promotion_id = p.promotion_id
      WHERE 1=1`;
    const params = [];

    if (date_from) { params.push(date_from); q += ` AND DATE(t.transaction_date) >= $${params.length}`; }
    if (date_to) { params.push(date_to); q += ` AND DATE(t.transaction_date) <= $${params.length}`; }
    if (cashier_id) { params.push(cashier_id); q += ` AND t.cashier_id = $${params.length}`; }
    if (payment_method) { params.push(payment_method); q += ` AND t.payment_method = $${params.length}`; }
    if (status) { params.push(status); q += ` AND t.status = $${params.length}`; }
    if (customer_type) { params.push(customer_type); q += ` AND t.customer_type = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (c.full_name ILIKE $${params.length} OR t.receipt_number ILIKE $${params.length})`;
    }

    q += ` ORDER BY t.transaction_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(lim, offset);

    const result = await pool.query(q, params);
    
    // Get items for each transaction
    const salesWithItems = [];
    for (const sale of result.rows) {
      const items = await pool.query(
        `SELECT ti.*, p.name AS product_name
         FROM transaction_items ti
         JOIN products p ON ti.product_id = p.product_id
         WHERE ti.transaction_id = $1`,
        [sale.transaction_id]
      );
      salesWithItems.push({
        ...sale,
        items: items.rows
      });
    }

    return res.json({ success: true, sales: salesWithItems, count: result.rowCount });
  } catch (err) {
    console.error('[sales/getAll]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load sales. Please try again later.' 
    });
  }
};

// ============================================================
// GET SALE BY ID
// ============================================================

const getById = async (req, res) => {
  try {
    const tx = await pool.query(
      `SELECT t.*, u.full_name AS cashier_full,
              p.name AS promotion_name
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.user_id
       LEFT JOIN promotions p ON t.promotion_id = p.promotion_id
       WHERE t.transaction_id = $1`,
      [req.params.id]
    );
    if (!tx.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found. Please check the transaction ID and try again.' 
      });
    }
    
    const items = await pool.query(
      `SELECT ti.*, p.name AS product_name, p.barcode
       FROM transaction_items ti
       JOIN products p ON ti.product_id = p.product_id
       WHERE ti.transaction_id = $1`,
      [req.params.id]
    );

    const splits = await pool.query(
      `SELECT * FROM payment_splits WHERE transaction_id = $1`,
      [req.params.id]
    );

    return res.json({
      success: true,
      transaction: tx.rows[0],
      items: items.rows,
      payment_splits: splits.rows
    });
  } catch (err) {
    console.error('[sales/getById]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load transaction details. Please try again.' 
    });
  }
};

// ============================================================
// GET SALE BY RECEIPT NUMBER
// ============================================================

const getByReceipt = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name AS cashier_full,
              p.name AS promotion_name
       FROM transactions t
       LEFT JOIN users u ON t.cashier_id = u.user_id
       LEFT JOIN promotions p ON t.promotion_id = p.promotion_id
       WHERE t.receipt_number = $1`,
      [req.params.receipt_number]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found. Please check the receipt number and try again.'
      });
    }

    // Get transaction items with product details
    const items = await pool.query(
      `SELECT 
        ti.item_id,
        ti.transaction_id,
        ti.product_id,
        ti.quantity,
        ti.unit_type,
        ti.unit_price,
        ti.cost_at_sale,
        ti.discount_applied,
        ti.tax_rate,
        ti.tax_exempt,
        ti.taxable_amount,
        ti.tax_amount,
        ti.total_price,
        ti.created_at,
        p.name AS product_name,
        p.barcode,
        p.sku
       FROM transaction_items ti
       JOIN products p ON ti.product_id = p.product_id
       WHERE ti.transaction_id = $1
       ORDER BY ti.item_id ASC`,
      [result.rows[0].transaction_id]
    );

    // Check if there are items to return
    if (items.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'This receipt has no items to return. Please enter a sales receipt number (not a payment receipt).'
      });
    }

    const splits = await pool.query(
      `SELECT * FROM payment_splits WHERE transaction_id = $1`,
      [result.rows[0].transaction_id]
    );

    return res.json({
      success: true,
      transaction: result.rows[0],
      items: items.rows,
      payment_splits: splits.rows
    });

  } catch (err) {
    console.error('[sales/getByReceipt]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load transaction. Please try again.'
    });
  }
};

// ============================================================
// TODAY'S SALES SUMMARY
// ============================================================

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
         COALESCE(SUM(CASE WHEN payment_method = 'layby' THEN total_amount ELSE 0 END), 0) AS layby_sales,
         COALESCE(SUM(CASE WHEN customer_type = 'wholesale' THEN total_amount ELSE 0 END), 0) AS wholesale_sales,
         COALESCE(SUM(CASE WHEN customer_type = 'retail' THEN total_amount ELSE 0 END), 0) AS retail_sales,
         COALESCE(SUM(discount_amount), 0) AS total_discounts,
         COALESCE(SUM(CASE WHEN promotion_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS promotion_used_count
       FROM transactions
       WHERE DATE(transaction_date) = CURRENT_DATE AND status = 'completed'`
    );
    return res.json({ success: true, summary: result.rows[0] });
  } catch (err) {
    console.error('[sales/todaySummary]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load today\'s sales summary. Please try again.' 
    });
  }
};

module.exports = { create, getAll, getById, getByReceipt, todaySummary };