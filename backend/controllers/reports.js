const pool = require('../config/db');

const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  const today = new Date();
  const due = new Date(dueDate);
  return today > due;
};

const getDaysOverdue = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = today - due;
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const dailySales = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_daily_sales LIMIT 30`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    console.error('[reports/dailySales]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch daily sales report.' });
  }
};

const topProducts = async (req, res) => {
  const { limit=10 } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM v_top_products LIMIT $1`, [parseInt(limit,10)]);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    console.error('[reports/topProducts]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch top products report.' });
  }
};

const inventoryStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_inventory_status`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    console.error('[reports/inventoryStatus]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch inventory status report.' });
  }
};

const cashierPerformance = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_cashier_performance`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    console.error('[reports/cashierPerformance]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch cashier performance report.' });
  }
};

const profitLoss = async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    let q = `
      SELECT
        COALESCE(SUM(ti.total_price),0) AS total_revenue,
        COALESCE(SUM(ti.quantity * ti.cost_at_sale),0) AS total_cost,
        COALESCE(SUM(ti.total_price) - SUM(ti.quantity * ti.cost_at_sale),0) AS gross_profit,
        COALESCE(SUM(t.tax_amount),0) AS total_tax,
        COALESCE(SUM(t.discount_amount),0) AS total_discounts,
        COUNT(DISTINCT t.transaction_id) AS total_transactions
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id=t.transaction_id
      WHERE t.status='completed'
    `;
    const params = [];
    if (date_from) { params.push(date_from); q += ` AND DATE(t.transaction_date)>=$${params.length}`; }
    if (date_to)   { params.push(date_to);   q += ` AND DATE(t.transaction_date)<=$${params.length}`; }
    const result = await pool.query(q, params);
    return res.json({ success: true, report: result.rows[0] });
  } catch (err) {
    console.error('[reports/profitLoss]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch profit and loss report.' });
  }
};

const paymentMethodReport = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let q = `
      SELECT 
        payment_method,
        COUNT(*) AS transaction_count,
        COALESCE(SUM(amount), 0) AS total_amount
      FROM payment_splits ps
      JOIN transactions t ON ps.transaction_id = t.transaction_id
      WHERE t.status = 'completed'
    `;
    const params = [];
    if (date_from) { params.push(date_from); q += ` AND DATE(t.transaction_date)>=$${params.length}`; }
    if (date_to)   { params.push(date_to);   q += ` AND DATE(t.transaction_date)<=$${params.length}`; }
    q += ` GROUP BY payment_method ORDER BY total_amount DESC`;
    
    const result = await pool.query(q, params);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    console.error('[reports/paymentMethodReport]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch payment method report.' });
  }
};

const summary = async (req, res) => {
  try {
    const today = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE DATE(transaction_date)=CURRENT_DATE AND status='completed'`);
    const week = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE transaction_date>=CURRENT_DATE-INTERVAL '7 days' AND status='completed'`);
    const month = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',CURRENT_DATE) AND status='completed'`);
    const lowstock = await pool.query(`SELECT COUNT(*)::INT AS count FROM products WHERE status='active' AND stock_quantity<=reorder_level`);
    const expired = await pool.query(`SELECT COUNT(*)::INT AS count FROM products WHERE status='active' AND expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE AND stock_quantity > 0`);
    
    const splitStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT transaction_id) AS split_transactions,
        COUNT(*) AS total_splits
      FROM payment_splits
      WHERE created_at >= CURRENT_DATE
    `);

    const debtorsStats = await pool.query(
      `SELECT COUNT(*)::INT AS debtor_count, COALESCE(SUM(current_balance),0) AS total_owed
       FROM customers WHERE current_balance > 0`
    );
    
    return res.json({ 
      success: true, 
      summary: { 
        today: today.rows[0], 
        week: week.rows[0], 
        month: month.rows[0], 
        low_stock_count: lowstock.rows[0].count,
        expired_count: expired.rows[0].count,
        split_transactions: splitStats.rows[0]?.split_transactions || 0,
        total_splits: splitStats.rows[0]?.total_splits || 0,
        debtor_count: debtorsStats.rows[0].debtor_count,
        total_owed: debtorsStats.rows[0].total_owed
      } 
    });
  } catch (err) {
    console.error('[reports/summary]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch summary report.' });
  }
};

const expiredProductsReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.product_id,
        p.name,
        p.sku,
        p.stock_quantity,
        p.expiry_date,
        (CURRENT_DATE - p.expiry_date) AS days_expired,
        c.name AS category_name,
        COALESCE((
          SELECT COUNT(*) 
          FROM expired_products_log epl 
          WHERE epl.product_id = p.product_id
        ), 0) AS reported_count,
        COALESCE((
          SELECT SUM(quantity) 
          FROM expired_products_log epl 
          WHERE epl.product_id = p.product_id
        ), 0) AS total_reported_quantity
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
      AND p.expiry_date IS NOT NULL 
      AND p.expiry_date <= CURRENT_DATE
      AND p.stock_quantity > 0
      ORDER BY days_expired DESC
    `);
    return res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('[reports/expiredProductsReport]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch expired products report.' });
  }
};

const debtorsReport = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.customer_id,
        c.full_name,
        c.phone,
        c.business_name,
        c.customer_type,
        c.credit_limit,
        c.current_balance,
        oldest.transaction_date AS oldest_transaction_date,
        oldest.due_date AS due_date,
        oldest.payment_method AS oldest_payment_method,
        lastpay.payment_date AS last_payment_date,
        lastpay.amount AS last_payment_amount
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT t.transaction_date, t.due_date, t.payment_method
        FROM transactions t
        WHERE t.customer_id = c.customer_id
          AND t.payment_method IN ('credit', 'layby')
          AND t.payment_status = 'pending'
        ORDER BY t.transaction_date ASC
        LIMIT 1
      ) oldest ON true
      LEFT JOIN LATERAL (
        SELECT payment_date, amount
        FROM (
          SELECT t.transaction_date AS payment_date, ct.amount AS amount
          FROM credit_transactions ct
          JOIN transactions t ON ct.transaction_id = t.transaction_id
          WHERE ct.customer_id = c.customer_id AND ct.transaction_type = 'payment'
          UNION ALL
          SELECT lp.payment_date, lp.amount_paid AS amount
          FROM layby_payments lp
          JOIN transactions t2 ON lp.transaction_id = t2.transaction_id
          WHERE t2.customer_id = c.customer_id
        ) combined_payments
        ORDER BY payment_date DESC
        LIMIT 1
      ) lastpay ON true
      WHERE c.current_balance > 0
      ORDER BY c.current_balance DESC
    `);

    const debtors = result.rows.map(row => ({
      ...row,
      is_overdue: isOverdue(row.due_date),
      days_overdue: row.due_date ? getDaysOverdue(row.due_date) : null,
      available_credit: row.credit_limit != null
        ? parseFloat(row.credit_limit) - parseFloat(row.current_balance)
        : null
    }));

    const totals = debtors.reduce((acc, d) => {
      acc.total_owed += parseFloat(d.current_balance) || 0;
      if (d.is_overdue) acc.overdue_count += 1;
      return acc;
    }, { total_owed: 0, overdue_count: 0 });

    return res.json({
      success: true,
      report: debtors,
      totals: {
        debtor_count: debtors.length,
        total_owed: totals.total_owed,
        overdue_count: totals.overdue_count
      }
    });
  } catch (err) {
    console.error('[reports/debtorsReport]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch debtors report.' });
  }
};

module.exports = { 
  dailySales, 
  topProducts, 
  inventoryStatus, 
  cashierPerformance, 
  profitLoss, 
  paymentMethodReport,
  summary,
  expiredProductsReport,
  debtorsReport
};