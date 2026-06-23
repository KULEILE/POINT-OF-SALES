const pool = require('../config/db');
const { paginate, auditLog } = require('../utils/helpers');

const getAll = async (req, res) => {
  const { search, page=1, limit=20 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  try {
    let q = `SELECT * FROM suppliers WHERE is_active=TRUE`;
    const params = [];
    if (search) { params.push(`%${search}%`); q += ` AND (name ILIKE $${params.length} OR contact_name ILIKE $${params.length})`; }
    q += ` ORDER BY name ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(lim, offset);
    const result = await pool.query(q, params);
    return res.json({ success: true, suppliers: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch suppliers.' });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM suppliers WHERE supplier_id=$1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    return res.json({ success: true, supplier: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const { name, contact_name, phone, email, address, vat_number, payment_terms, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Supplier name is required.' });
  try {
    const result = await pool.query(
      `INSERT INTO suppliers (name,contact_name,phone,email,address,vat_number,payment_terms,notes,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, contact_name||null, phone||null, email||null, address||null, vat_number||null, payment_terms||30, notes||null, req.user.user_id]
    );
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'CREATE_SUPPLIER', action_details: `Created: ${name}`, affected_table: 'suppliers', affected_record_id: result.rows[0].supplier_id });
    return res.status(201).json({ success: true, supplier: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to create supplier.' });
  }
};

const update = async (req, res) => {
  const allowed = ['name','contact_name','phone','email','address','vat_number','payment_terms','notes','is_active'];
  const updates = []; const values = [];
  allowed.forEach(k => { if (req.body[k] !== undefined) { values.push(req.body[k]); updates.push(`${k}=$${values.length}`); } });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
  values.push(req.params.id);
  try {
    const result = await pool.query(`UPDATE suppliers SET ${updates.join(',')},updated_at=NOW() WHERE supplier_id=$${values.length} RETURNING *`, values);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Supplier not found.' });
    return res.json({ success: true, supplier: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update supplier.' });
  }
};

module.exports = { getAll, getById, create, update };
