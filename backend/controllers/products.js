const pool = require('../config/db');
const { paginate, auditLog } = require('../utils/helpers');

const getAll = async (req, res) => {
  const { search, category_id, status = 'active', page = 1, limit = 60 } = req.query;
  const { limit: lim, offset } = paginate(page, limit);
  try {
    let q = `SELECT p.*, c.name AS category_name, s.name AS supplier_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.category_id
             LEFT JOIN suppliers  s ON p.supplier_id  = s.supplier_id
             WHERE p.status = $1`;
    const params = [status];
    if (search) {
      params.push(`%${search}%`);
      q += ` AND (p.name ILIKE $${params.length} OR p.barcode = $${params.length} OR p.sku ILIKE $${params.length} OR p.local_name ILIKE $${params.length})`;
    }
    if (category_id) { params.push(category_id); q += ` AND p.category_id = $${params.length}`; }
    q += ` ORDER BY p.name ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(lim, offset);
    const result = await pool.query(q, params);
    return res.json({ success: true, products: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('[products/getAll]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN suppliers  s ON p.supplier_id  = s.supplier_id
       WHERE p.product_id = $1`, [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getByBarcode = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE (p.barcode = $1 OR p.alternative_barcode = $1) AND p.status = 'active' LIMIT 1`,
      [req.params.barcode]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order, name`);
    return res.json({ success: true, categories: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getLowStock = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_low_stock_alerts`);
    return res.json({ success: true, products: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const create = async (req, res) => {
  const { name, local_name, description, category_id, supplier_id, brand, sku, barcode, cost_price, selling_price, tax_rate, tax_exempt, sold_by_weight, weight_unit, reorder_level, reorder_quantity, stock_quantity, stock_unit } = req.body;
  if (!name || !sku || selling_price == null || cost_price == null) {
    return res.status(400).json({ success: false, message: 'name, sku, selling_price and cost_price are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO products (name,local_name,description,category_id,supplier_id,brand,sku,barcode,cost_price,selling_price,tax_rate,tax_exempt,sold_by_weight,weight_unit,reorder_level,reorder_quantity,stock_quantity,stock_unit,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [name, local_name||null, description||null, category_id||null, supplier_id||null, brand||null, sku, barcode||null, cost_price, selling_price, tax_rate??15, tax_exempt??false, sold_by_weight??false, weight_unit||null, reorder_level??10, reorder_quantity??50, stock_quantity??0, stock_unit||'piece', req.user.user_id]
    );
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'CREATE_PRODUCT', action_details: `Created: ${name}`, affected_table: 'products', affected_record_id: result.rows[0].product_id, new_values: result.rows[0] });
    return res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'SKU or barcode already exists.' });
    console.error('[products/create]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

const update = async (req, res) => {
  const allowed = ['name','local_name','description','category_id','supplier_id','brand','barcode','selling_price','cost_price','tax_rate','tax_exempt','reorder_level','status','image_url'];
  const updates = []; const values = [];
  allowed.forEach(k => { if (req.body[k] !== undefined) { values.push(req.body[k]); updates.push(`${k}=$${values.length}`); } });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
  values.push(req.params.id);
  try {
    const old = await pool.query(`SELECT * FROM products WHERE product_id = $1`, [req.params.id]);
    const result = await pool.query(`UPDATE products SET ${updates.join(',')}, updated_at=NOW() WHERE product_id=$${values.length} RETURNING *`, values);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Product not found.' });
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'UPDATE_PRODUCT', action_details: `Updated: ${result.rows[0].name}`, affected_table: 'products', affected_record_id: result.rows[0].product_id, old_values: old.rows[0], new_values: result.rows[0] });
    return res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

module.exports = { getAll, getById, getByBarcode, getCategories, getLowStock, create, update };
