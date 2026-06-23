const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

const getStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_inventory_status`);
    return res.json({ success: true, inventory: result.rows });
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

const adjust = async (req, res) => {
  const { product_id, movement_type, quantity, notes, unit_cost, batch_number, expiry_date } = req.body;
  if (!product_id || !movement_type || quantity == null) {
    return res.status(400).json({ success: false, message: 'product_id, movement_type and quantity are required.' });
  }
  const validTypes = ['purchase','damaged','lost','adjustment','opening_stock','return_in','return_out'];
  if (!validTypes.includes(movement_type)) {
    return res.status(400).json({ success: false, message: `Invalid movement_type. Must be: ${validTypes.join(', ')}` });
  }
  try {
    const prod = await pool.query(`SELECT stock_quantity, name FROM products WHERE product_id=$1`, [product_id]);
    if (!prod.rows[0]) return res.status(404).json({ success: false, message: 'Product not found.' });

    const before = parseFloat(prod.rows[0].stock_quantity);
    const delta  = ['damaged','lost','sale','return_out'].includes(movement_type) ? -Math.abs(quantity) : Math.abs(quantity);
    const after  = before + delta;

    await pool.query(`UPDATE products SET stock_quantity=$1, updated_at=NOW() WHERE product_id=$2`, [after, product_id]);
    await pool.query(
      `INSERT INTO inventory (product_id,movement_type,quantity,quantity_before,quantity_after,unit_cost,batch_number,expiry_date,notes,performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [product_id, movement_type, delta, before, after, unit_cost||null, batch_number||null, expiry_date||null, notes||null, req.user.user_id]
    );
    await pool.query(
      `INSERT INTO stock_movements (product_id,movement_type,quantity,quantity_before,quantity_after,unit_cost,notes,performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [product_id, movement_type, delta, before, after, unit_cost||null, notes||null, req.user.user_id]
    );
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'STOCK_ADJUSTMENT', action_details: `${movement_type} on ${prod.rows[0].name}: ${before} → ${after}`, affected_table: 'products', affected_record_id: product_id });
    return res.json({ success: true, message: 'Stock adjusted.', quantity_before: before, quantity_after: after });
  } catch (err) {
    console.error('[inventory/adjust]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to adjust stock.' });
  }
};

const getMovements = async (req, res) => {
  const { product_id, movement_type, page=1, limit=30 } = req.query;
  try {
    let q = `SELECT sm.*,p.name AS product_name,u.full_name AS performed_by_name FROM stock_movements sm JOIN products p ON sm.product_id=p.product_id LEFT JOIN users u ON sm.performed_by=u.user_id WHERE 1=1`;
    const params = [];
    if (product_id)    { params.push(product_id);    q += ` AND sm.product_id=$${params.length}`; }
    if (movement_type) { params.push(movement_type); q += ` AND sm.movement_type=$${params.length}`; }
    q += ` ORDER BY sm.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit,10), (parseInt(page,10)-1)*parseInt(limit,10));
    const result = await pool.query(q, params);
    return res.json({ success: true, movements: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getStatus, getLowStock, adjust, getMovements };
