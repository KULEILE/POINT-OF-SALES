const pool = require('../config/db');

const dailySales = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_daily_sales LIMIT 30`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const topProducts = async (req, res) => {
  const { limit=10 } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM v_top_products LIMIT $1`, [parseInt(limit,10)]);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const inventoryStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_inventory_status`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const cashierPerformance = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_cashier_performance`);
    return res.json({ success: true, report: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const profitLoss = async (req, res) => {
  const { date_from, date_to } = req.query;
  try {
    let q = `
      SELECT
        COALESCE(SUM(ti.total_price),0)                          AS total_revenue,
        COALESCE(SUM(ti.quantity * ti.cost_at_sale),0)           AS total_cost,
        COALESCE(SUM(ti.total_price) - SUM(ti.quantity * ti.cost_at_sale),0) AS gross_profit,
        COALESCE(SUM(t.tax_amount),0)                            AS total_tax,
        COALESCE(SUM(t.discount_amount),0)                       AS total_discounts,
        COUNT(DISTINCT t.transaction_id)                         AS total_transactions
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
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const summary = async (req, res) => {
  try {
    const today   = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE DATE(transaction_date)=CURRENT_DATE AND status='completed'`);
    const week    = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE transaction_date>=CURRENT_DATE-INTERVAL '7 days' AND status='completed'`);
    const month   = await pool.query(`SELECT COALESCE(SUM(total_amount),0) AS total, COUNT(*)::INT AS count FROM transactions WHERE DATE_TRUNC('month',transaction_date)=DATE_TRUNC('month',CURRENT_DATE) AND status='completed'`);
    const lowstock = await pool.query(`SELECT COUNT(*)::INT AS count FROM products WHERE status='active' AND stock_quantity<=reorder_level`);
    return res.json({ success: true, summary: { today: today.rows[0], week: week.rows[0], month: month.rows[0], low_stock_count: lowstock.rows[0].count } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { dailySales, topProducts, inventoryStatus, cashierPerformance, profitLoss, summary };
