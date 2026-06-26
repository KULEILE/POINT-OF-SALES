const pool = require('../config/db');
const { paginate, auditLog } = require('../utils/helpers');

const getAll = async (req, res) => {
  const { search, customer_type, page = 1, limit = 20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  try {
    let q = `SELECT * FROM customers WHERE is_active = TRUE`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (full_name ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    if (customer_type) {
      params.push(customer_type);
      q += ` AND customer_type = $${params.length}`;
    }
    q += ` ORDER BY full_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(lim, offset);
    const result = await pool.query(q, params);
    return res.json({ success: true, customers: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[customers/getAll]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

const getById = async (req, res) => {
  try {
    const cust = await pool.query(`SELECT * FROM customers WHERE customer_id = $1`, [req.params.id]);
    if (!cust.rows[0]) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    const txs = await pool.query(
      `SELECT transaction_id, receipt_number, transaction_date, total_amount, payment_method, status 
       FROM transactions 
       WHERE customer_id = $1 
       ORDER BY transaction_date DESC 
       LIMIT 20`,
      [req.params.id]
    );
    return res.json({ success: true, customer: cust.rows[0], transactions: txs.rows });
  } catch (err) {
    console.error('[customers/getById]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getCustomerDetails = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customerResult = await pool.query(
      `SELECT * FROM customers WHERE customer_id = $1`,
      [customerId]
    );

    if (!customerResult.rows[0]) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = customerResult.rows[0];

    const creditTransactions = await pool.query(
      `SELECT ct.*, t.receipt_number, t.transaction_date, t.transaction_type
       FROM credit_transactions ct
       JOIN transactions t ON ct.transaction_id = t.transaction_id
       WHERE ct.customer_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT 20`,
      [customerId]
    );

    const laybyTransactions = await pool.query(
      `SELECT t.transaction_id, t.receipt_number, t.transaction_date, 
              t.total_amount, t.amount_paid, t.balance_due, t.payment_status,
              (SELECT COUNT(*) FROM layby_payments lp WHERE lp.transaction_id = t.transaction_id) AS payment_count
       FROM transactions t
       WHERE t.customer_id = $1 AND t.payment_method = 'layby'
       ORDER BY t.transaction_date DESC`,
      [customerId]
    );

    const recentTransactions = await pool.query(
      `SELECT transaction_id, receipt_number, transaction_date, total_amount, payment_method, status
       FROM transactions 
       WHERE customer_id = $1
       ORDER BY transaction_date DESC
       LIMIT 10`,
      [customerId]
    );

    return res.json({
      success: true,
      customer: customer,
      credit_transactions: creditTransactions.rows,
      layby_transactions: laybyTransactions.rows,
      recent_transactions: recentTransactions.rows,
      total_credit_balance: parseFloat(customer.current_balance) || 0,
      open_layby_count: laybyTransactions.rows.filter(l => l.payment_status === 'pending').length
    });

  } catch (err) {
    console.error('[customers/getCustomerDetails]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer details.' });
  }
};

const create = async (req, res) => {
  const { full_name, phone, email, address, id_number, district, village_area, customer_type, credit_limit } = req.body;
  if (!full_name) {
    return res.status(400).json({ success: false, message: 'Full name is required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO customers (full_name, phone, email, address, id_number, district, village_area, customer_type, credit_limit, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [full_name, phone || null, email || null, address || null, id_number || null, district || null, village_area || null, customer_type || 'walk_in', credit_limit || 0, req.user.user_id]
    );
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CREATE_CUSTOMER',
      action_details: `Created: ${full_name}`,
      affected_table: 'customers',
      affected_record_id: result.rows[0].customer_id
    });
    return res.status(201).json({ success: true, customer: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'Phone number already registered.' });
    }
    console.error('[customers/create]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
};

const update = async (req, res) => {
  const allowed = ['full_name', 'phone', 'email', 'address', 'district', 'village_area', 'customer_type', 'credit_limit', 'is_active'];
  const updates = [];
  const values = [];
  allowed.forEach(k => {
    if (req.body[k] !== undefined) {
      values.push(req.body[k]);
      updates.push(`${k} = $${values.length}`);
    }
  });
  if (!updates.length) {
    return res.status(400).json({ success: false, message: 'No fields to update.' });
  }
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE customer_id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }
    return res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    console.error('[customers/update]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update customer.' });
  }
};

const getBalances = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_customer_balances`);
    return res.json({ success: true, customers: result.rows });
  } catch (err) {
    console.error('[customers/getBalances]', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAll, getById, getCustomerDetails, create, update, getBalances };