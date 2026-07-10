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

    const product = result.rows[0];
    if (product.expiry_date && new Date(product.expiry_date) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: `This product has expired on ${new Date(product.expiry_date).toLocaleDateString()}. Please remove it from sale.`
      });
    }

    return res.json({ success: true, product: product });
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
    const result = await pool.query(`SELECT * FROM v_low_stock_alerts ORDER BY
      CASE
        WHEN stock_quantity <= 0 THEN 1
        WHEN stock_quantity <= min_stock THEN 2
        WHEN expiry_date IS NOT NULL AND expiry_date <= CURRENT_DATE THEN 3
        ELSE 4
      END`);
    return res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('[products/getLowStock]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch low stock products.' });
  }
};

const getExpiredProducts = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_expired_products ORDER BY days_expired DESC`);
    return res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('[products/getExpiredProducts]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch expired products.' });
  }
};

const create = async (req, res) => {
  const {
    name, local_name, description, category_id, supplier_id, brand, sku, barcode,
    cost_price, selling_price, wholesale_price, tax_rate, tax_exempt, sold_by_weight, weight_unit,
    reorder_level, reorder_quantity, stock_quantity, stock_unit, expiry_date, min_stock, location,
    // NEW: these were being silently dropped before — never destructured, never inserted
    variant_group, variant_name, variant_value
  } = req.body;

  if (!name || !sku || selling_price == null || cost_price == null) {
    return res.status(400).json({ success: false, message: 'Name, SKU, selling price and cost price are required.' });
  }

  if (expiry_date) {
    const expiry = new Date(expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date cannot be in the past. Please select a future date.'
      });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (
        name, local_name, description, category_id, supplier_id, brand, sku, barcode,
        cost_price, selling_price, wholesale_price, tax_rate, tax_exempt, sold_by_weight, weight_unit,
        reorder_level, reorder_quantity, stock_quantity, stock_unit,
        expiry_date, min_stock, location, created_by,
        variant_group, variant_name, variant_value
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
      [
        name, local_name||null, description||null, category_id||null, supplier_id||null,
        brand||null, sku, barcode||null, cost_price, selling_price, wholesale_price||null,
        tax_rate??15, tax_exempt??false, sold_by_weight??false, weight_unit||null,
        reorder_level??10, reorder_quantity??50, stock_quantity??0, stock_unit||'piece',
        expiry_date||null, min_stock??5, location||'Main Store', req.user.user_id,
        variant_group||name||null, variant_name||null, variant_value!=null ? parseFloat(variant_value) : (cost_price??0)
      ]
    );
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CREATE_PRODUCT',
      action_details: `Created: ${name}`,
      affected_table: 'products',
      affected_record_id: result.rows[0].product_id,
      new_values: result.rows[0]
    });
    return res.status(201).json({ success: true, product: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'SKU or barcode already exists.' });
    console.error('[products/create]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
};

const update = async (req, res) => {
  const allowed = [
    'name','local_name','description','category_id','supplier_id','brand','barcode',
    'selling_price','wholesale_price','cost_price','tax_rate','tax_exempt','reorder_level',
    'status','image_url','min_stock','location',
    // NEW: these were missing from the whitelist, so edits to name/size/cost
    // never propagated to variant_group/variant_name/variant_value on update
    'variant_group','variant_name','variant_value'
  ];
  const updates = [];
  const values = [];

  allowed.forEach(k => {
    if (req.body[k] !== undefined) {
      values.push(req.body[k]);
      updates.push(`${k}=$${values.length}`);
    }
  });

  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });

  values.push(req.params.id);
  try {
    if (req.body.expiry_date !== undefined) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date cannot be edited after product creation. Please contact administrator.'
      });
    }

    const old = await pool.query(`SELECT * FROM products WHERE product_id = $1`, [req.params.id]);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(',')}, updated_at=NOW() WHERE product_id=$${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Product not found.' });

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'UPDATE_PRODUCT',
      action_details: `Updated: ${result.rows[0].name}`,
      affected_table: 'products',
      affected_record_id: result.rows[0].product_id,
      old_values: old.rows[0],
      new_values: result.rows[0]
    });
    return res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error('[products/update]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
};

module.exports = {
  getAll, getById, getByBarcode, getCategories,
  getLowStock, getExpiredProducts, create, update
};