const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

const getWholesaleSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM wholesale_settings LIMIT 1`);
    if (!result.rows[0]) {
      // Insert default settings if none exist
      await pool.query(`
        INSERT INTO wholesale_settings (min_wholesale_quantity, enable_tiered_discounts)
        VALUES (10, false)
      `);
      const newResult = await pool.query(`SELECT * FROM wholesale_settings LIMIT 1`);
      return res.json({ success: true, settings: newResult.rows[0] });
    }
    return res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('[settings/getWholesaleSettings]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch wholesale settings.' });
  }
};

const updateWholesaleSettings = async (req, res) => {
  const {
    min_wholesale_quantity,
    enable_tiered_discounts,
    default_discount_percentage,
    require_min_order,
    min_order_value,
    invoice_prefix
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE wholesale_settings 
       SET min_wholesale_quantity = $1,
           enable_tiered_discounts = $2,
           default_discount_percentage = $3,
           require_min_order = $4,
           min_order_value = $5,
           invoice_prefix = $6,
           updated_at = NOW(),
           updated_by = $7
       RETURNING *`,
      [
        min_wholesale_quantity || 10,
        enable_tiered_discounts || false,
        default_discount_percentage || 0,
        require_min_order || false,
        min_order_value || 500,
        invoice_prefix || 'INV',
        req.user.user_id
      ]
    );

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'UPDATE_SETTINGS',
      action_details: 'Updated wholesale settings',
      affected_table: 'wholesale_settings',
      affected_record_id: result.rows[0].id
    });

    return res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('[settings/updateWholesaleSettings]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update wholesale settings.' });
  }
};

const getDiscountTiers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM discount_tiers 
      WHERE is_active = TRUE 
      ORDER BY min_quantity ASC
    `);
    return res.json({ success: true, tiers: result.rows });
  } catch (err) {
    console.error('[settings/getDiscountTiers]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch discount tiers.' });
  }
};

const updateDiscountTiers = async (req, res) => {
  const { tiers } = req.body;

  if (!tiers || !Array.isArray(tiers)) {
    return res.status(400).json({ success: false, message: 'Tiers must be an array.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deactivate all existing tiers
    await client.query(`UPDATE discount_tiers SET is_active = FALSE`);

    // Insert new tiers
    for (const tier of tiers) {
      await client.query(
        `INSERT INTO discount_tiers (min_quantity, max_quantity, discount_percentage, is_active)
         VALUES ($1, $2, $3, TRUE)`,
        [tier.min_quantity, tier.max_quantity || null, tier.discount_percentage]
      );
    }

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'UPDATE_SETTINGS',
      action_details: 'Updated discount tiers',
      affected_table: 'discount_tiers'
    });

    const result = await pool.query(`
      SELECT * FROM discount_tiers 
      WHERE is_active = TRUE 
      ORDER BY min_quantity ASC
    `);

    return res.json({ success: true, tiers: result.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[settings/updateDiscountTiers]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update discount tiers.' });
  } finally {
    client.release();
  }
};

module.exports = {
  getWholesaleSettings,
  updateWholesaleSettings,
  getDiscountTiers,
  updateDiscountTiers
};