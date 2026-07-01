const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

const getStatus = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_inventory_status`);
    return res.json({ success: true, inventory: result.rows });
  } catch (err) {
    console.error('[inventory/getStatus]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load inventory status. Please try again later.' 
    });
  }
};

const getLowStock = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM v_low_stock_alerts`);
    return res.json({ success: true, products: result.rows });
  } catch (err) {
    console.error('[inventory/getLowStock]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load low stock products. Please try again later.' 
    });
  }
};

const getExpiredProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.product_id, p.name, p.sku, p.stock_quantity, p.expiry_date,
             (CURRENT_DATE - p.expiry_date) AS days_expired,
             c.name AS category_name
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
    console.error('[inventory/getExpiredProducts]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load expired products. Please try again later.' 
    });
  }
};

const adjust = async (req, res) => {
  const { product_id, movement_type, quantity, notes, unit_cost, batch_number, expiry_date } = req.body;
  
  if (!product_id || !movement_type || quantity == null) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please select a product, movement type, and enter a quantity.' 
    });
  }
  
  const validTypes = ['purchase','damaged','lost','adjustment','opening_stock','return_in','return_out'];
  if (!validTypes.includes(movement_type)) {
    return res.status(400).json({ 
      success: false, 
      message: `Invalid movement type. Please choose from: ${validTypes.join(', ')}` 
    });
  }
  
  try {
    const prod = await pool.query(`SELECT stock_quantity, name FROM products WHERE product_id=$1`, [product_id]);
    if (!prod.rows[0]) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found. Please check the product ID and try again.' 
      });
    }

    const before = parseFloat(prod.rows[0].stock_quantity);
    const delta = ['damaged','lost','sale','return_out'].includes(movement_type) ? -Math.abs(quantity) : Math.abs(quantity);
    const after = before + delta;

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
    await auditLog(pool, { 
      user_id: req.user.user_id, 
      username: req.user.username, 
      action_type: 'STOCK_ADJUSTMENT', 
      action_details: `${movement_type} on ${prod.rows[0].name}: ${before} → ${after}`, 
      affected_table: 'products', 
      affected_record_id: product_id 
    });
    return res.json({ 
      success: true, 
      message: `Stock adjusted successfully. ${prod.rows[0].name} quantity changed from ${before} to ${after}.`, 
      quantity_before: before, 
      quantity_after: after 
    });
  } catch (err) {
    console.error('[inventory/adjust]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to adjust stock. Please try again or contact support.' 
    });
  }
};

const bulkAdjust = async (req, res) => {
  const { adjustments } = req.body;
  
  if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please add at least one product to adjust.' 
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    const errors = [];

    for (const adj of adjustments) {
      const { product_id, movement_type, quantity, notes, unit_cost } = adj;
      
      if (!product_id || !movement_type || quantity == null) {
        errors.push({ product_id, error: 'Missing product ID, movement type, or quantity.' });
        continue;
      }

      try {
        const prod = await client.query(`SELECT stock_quantity, name FROM products WHERE product_id=$1`, [product_id]);
        if (!prod.rows[0]) {
          errors.push({ product_id, error: 'Product not found.' });
          continue;
        }

        const before = parseFloat(prod.rows[0].stock_quantity);
        const delta = ['damaged','lost','sale','return_out'].includes(movement_type) ? -Math.abs(quantity) : Math.abs(quantity);
        const after = before + delta;

        await client.query(`UPDATE products SET stock_quantity=$1, updated_at=NOW() WHERE product_id=$2`, [after, product_id]);
        await client.query(
          `INSERT INTO stock_movements (product_id,movement_type,quantity,quantity_before,quantity_after,unit_cost,notes,performed_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [product_id, movement_type, delta, before, after, unit_cost||null, notes||null, req.user.user_id]
        );
        
        results.push({ product_id, name: prod.rows[0].name, before, after });
      } catch (err) {
        errors.push({ product_id, error: err.message });
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Bulk adjustment completed. ${results.length} products updated. ${errors.length} products had errors.`,
      results,
      errors
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[inventory/bulkAdjust]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process bulk adjustment. Please try again.' 
    });
  } finally {
    client.release();
  }
};

const transferStock = async (req, res) => {
  const { product_id, from_location, to_location, quantity, notes } = req.body;
  
  if (!product_id || !from_location || !to_location || !quantity) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please select a product, from location, to location, and enter a quantity.' 
    });
  }

  if (from_location === to_location) {
    return res.status(400).json({ 
      success: false, 
      message: 'From location and to location cannot be the same. Please choose different locations.' 
    });
  }

  const transferQty = parseFloat(quantity);
  if (transferQty <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Quantity must be greater than zero.' 
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prod = await client.query(`SELECT stock_quantity, name FROM products WHERE product_id=$1`, [product_id]);
    if (!prod.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found. Please check and try again.' 
      });
    }

    const currentStock = parseFloat(prod.rows[0].stock_quantity);
    if (transferQty > currentStock) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock. Only ${currentStock} units available, but you requested ${transferQty}.` 
      });
    }

    await client.query(
      `UPDATE products SET location = $1, updated_at = NOW() WHERE product_id = $2`,
      [to_location, product_id]
    );

    await client.query(
      `INSERT INTO stock_transfers (from_location, to_location, product_id, quantity, transferred_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [from_location, to_location, product_id, transferQty, req.user.user_id, notes||null]
    );

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'STOCK_TRANSFER',
      action_details: `Transferred ${prod.rows[0].name} (${transferQty}) from ${from_location} to ${to_location}`,
      affected_table: 'products',
      affected_record_id: product_id
    });

    return res.json({
      success: true,
      message: `Stock transferred successfully. ${transferQty} unit(s) of ${prod.rows[0].name} moved from ${from_location} to ${to_location}.`,
      product: prod.rows[0].name,
      quantity: transferQty,
      from_location,
      to_location
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[inventory/transferStock]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to transfer stock. Please try again.' 
    });
  } finally {
    client.release();
  }
};

const reportExpired = async (req, res) => {
  const { product_id, quantity } = req.body;
  
  if (!product_id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please select a product to report as expired.' 
    });
  }

  const reportQty = parseFloat(quantity) || 0;
  if (reportQty <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please enter a quantity greater than zero.' 
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prod = await client.query(
      `SELECT name, expiry_date, stock_quantity FROM products WHERE product_id=$1`,
      [product_id]
    );
    if (!prod.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found. Please check and try again.' 
      });
    }

    const product = prod.rows[0];
    const currentStock = parseFloat(product.stock_quantity) || 0;

    if (reportQty > currentStock) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: `Cannot report ${reportQty} units. Only ${currentStock} units are available in stock.` 
      });
    }

    await client.query(
      `INSERT INTO expired_products_log (product_id, product_name, expiry_date, quantity, reported_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [product_id, product.name, product.expiry_date, reportQty, req.user.user_id]
    );

    const newStock = currentStock - reportQty;
    await client.query(
      `UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE product_id = $2`,
      [newStock, product_id]
    );

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'REPORT_EXPIRED',
      action_details: `Reported ${reportQty} units of ${product.name} as expired`,
      affected_table: 'products',
      affected_record_id: product_id
    });

    return res.json({
      success: true,
      message: `${reportQty} unit(s) of ${product.name} have been reported as expired and removed from stock. Remaining stock: ${newStock} units.`,
      product: product.name,
      quantity: reportQty,
      new_stock: newStock
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[inventory/reportExpired]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to report expired product. Please try again.' 
    });
  } finally {
    client.release();
  }
};

const getMovements = async (req, res) => {
  const { product_id, movement_type, page=1, limit=30 } = req.query;
  try {
    let q = `SELECT sm.*,p.name AS product_name,u.full_name AS performed_by_name 
             FROM stock_movements sm 
             JOIN products p ON sm.product_id=p.product_id 
             LEFT JOIN users u ON sm.performed_by=u.user_id 
             WHERE 1=1`;
    const params = [];
    if (product_id)    { params.push(product_id);    q += ` AND sm.product_id=$${params.length}`; }
    if (movement_type) { params.push(movement_type); q += ` AND sm.movement_type=$${params.length}`; }
    q += ` ORDER BY sm.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit,10), (parseInt(page,10)-1)*parseInt(limit,10));
    const result = await pool.query(q, params);
    return res.json({ success: true, movements: result.rows });
  } catch (err) {
    console.error('[inventory/getMovements]', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Unable to load stock movements. Please try again later.' 
    });
  }
};

module.exports = { 
  getStatus, 
  getLowStock, 
  getExpiredProducts, 
  adjust, 
  bulkAdjust, 
  transferStock, 
  reportExpired, 
  getMovements 
};