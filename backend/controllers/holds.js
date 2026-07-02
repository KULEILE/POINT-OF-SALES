const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

const create = async (req, res) => {
  const { customer_name, customer_phone, cart_data, notes } = req.body;

  if (!cart_data || !Array.isArray(cart_data) || cart_data.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot hold an empty cart. Please add items before holding the sale.'
    });
  }

  try {
    // Calculate totals from cart data
    let subtotal = 0;
    let itemCount = 0;
    for (const item of cart_data) {
      const price = parseFloat(item.unit_price || item.selling_price || 0);
      const quantity = parseFloat(item.quantity) || 0;
      subtotal += price * quantity;
      itemCount += quantity;
    }

    const totalAmount = subtotal;

    const result = await pool.query(
      `INSERT INTO held_sales (
        customer_name,
        customer_phone,
        cart_data,
        items_count,
        total_amount,
        cashier_id,
        cashier_name,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        customer_name || null,
        customer_phone || null,
        JSON.stringify(cart_data),
        itemCount,
        totalAmount.toFixed(2),
        req.user.user_id,
        req.user.full_name,
        notes || null
      ]
    );

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'HOLD_SALE',
      action_details: `Held sale for ${customer_name || 'Walk-in'} — ${itemCount} items — M ${totalAmount.toFixed(2)}`,
      affected_table: 'held_sales',
      affected_record_id: result.rows[0].hold_id
    });

    return res.status(201).json({
      success: true,
      message: 'Sale held successfully. You can resume it later.',
      hold: result.rows[0]
    });

  } catch (err) {
    console.error('[holds/create]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to hold sale. Please try again.'
    });
  }
};

const getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT h.*, u.full_name AS cashier_name
       FROM held_sales h
       LEFT JOIN users u ON h.cashier_id = u.user_id
       WHERE h.status = 'active'
       AND h.expires_at > NOW()
       ORDER BY h.created_at DESC`
    );

    return res.json({
      success: true,
      holds: result.rows
    });

  } catch (err) {
    console.error('[holds/getAll]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to load held sales. Please try again.'
    });
  }
};

const getById = async (req, res) => {
  try {
    const holdId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM held_sales WHERE hold_id = $1 AND status = 'active'`,
      [holdId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Held sale not found. It may have been resumed or expired.'
      });
    }

    return res.json({
      success: true,
      hold: result.rows[0]
    });

  } catch (err) {
    console.error('[holds/getById]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to load held sale. Please try again.'
    });
  }
};

const resume = async (req, res) => {
  const holdId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT * FROM held_sales WHERE hold_id = $1 AND status = 'active'`,
      [holdId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Held sale not found. It may have been resumed or expired.'
      });
    }

    const hold = result.rows[0];

    // Mark as resumed
    await pool.query(
      `UPDATE held_sales SET status = 'resumed' WHERE hold_id = $1`,
      [holdId]
    );

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'RESUME_SALE',
      action_details: `Resumed sale for ${hold.customer_name || 'Walk-in'} — ${hold.items_count} items`,
      affected_table: 'held_sales',
      affected_record_id: hold.hold_id
    });

    return res.json({
      success: true,
      message: 'Sale resumed successfully.',
      hold: hold
    });

  } catch (err) {
    console.error('[holds/resume]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to resume sale. Please try again.'
    });
  }
};

const remove = async (req, res) => {
  const holdId = req.params.id;

  try {
    const result = await pool.query(
      `UPDATE held_sales SET status = 'cancelled' WHERE hold_id = $1 RETURNING *`,
      [holdId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Held sale not found.'
      });
    }

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CANCEL_HOLD',
      action_details: `Cancelled held sale for ${result.rows[0].customer_name || 'Walk-in'}`,
      affected_table: 'held_sales',
      affected_record_id: holdId
    });

    return res.json({
      success: true,
      message: 'Held sale cancelled successfully.'
    });

  } catch (err) {
    console.error('[holds/remove]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel held sale. Please try again.'
    });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  resume,
  remove
};