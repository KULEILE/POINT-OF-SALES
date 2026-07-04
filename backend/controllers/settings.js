const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

// ============================================================
// WHOLESALE SETTINGS
// ============================================================

const getWholesaleSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM wholesale_settings LIMIT 1`);
    if (!result.rows[0]) {
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

// ============================================================
// DISCOUNT TIERS
// ============================================================

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

    await client.query(`UPDATE discount_tiers SET is_active = FALSE`);

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

// ============================================================
// RETURN SETTINGS
// ============================================================

const getReturnSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM return_settings LIMIT 1`);
    if (!result.rows[0]) {
      await pool.query(`
        INSERT INTO return_settings (
          return_window_days,
          require_receipt,
          no_receipt_action,
          manager_approval_threshold,
          max_returns_per_customer,
          allow_opened_items,
          allow_used_items,
          require_condition_check,
          allow_cash_refund,
          allow_card_refund,
          allow_mobile_refund,
          allow_store_credit,
          default_refund_method,
          notify_manager,
          high_value_notification
        ) VALUES (
          30, TRUE, 'store_credit', 500, 5,
          FALSE, FALSE, TRUE,
          TRUE, TRUE, TRUE, TRUE,
          'cash', TRUE, 500
        )
      `);
      const newResult = await pool.query(`SELECT * FROM return_settings LIMIT 1`);
      return res.json({ success: true, settings: newResult.rows[0] });
    }
    return res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('[settings/getReturnSettings]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch return settings.' });
  }
};

const updateReturnSettings = async (req, res) => {
  const {
    return_window_days,
    require_receipt,
    no_receipt_action,
    restocking_fee_percentage,
    manager_approval_threshold,
    max_returns_per_customer,
    allow_opened_items,
    allow_used_items,
    require_condition_check,
    allow_cash_refund,
    allow_card_refund,
    allow_mobile_refund,
    allow_store_credit,
    default_refund_method,
    notify_manager,
    high_value_notification,
    email_report
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE return_settings 
       SET return_window_days = $1,
           require_receipt = $2,
           no_receipt_action = $3,
           restocking_fee_percentage = $4,
           manager_approval_threshold = $5,
           max_returns_per_customer = $6,
           allow_opened_items = $7,
           allow_used_items = $8,
           require_condition_check = $9,
           allow_cash_refund = $10,
           allow_card_refund = $11,
           allow_mobile_refund = $12,
           allow_store_credit = $13,
           default_refund_method = $14,
           notify_manager = $15,
           high_value_notification = $16,
           email_report = $17,
           updated_at = NOW(),
           updated_by = $18
       RETURNING *`,
      [
        return_window_days || 30,
        require_receipt !== undefined ? require_receipt : true,
        no_receipt_action || 'store_credit',
        restocking_fee_percentage || 0,
        manager_approval_threshold || 500,
        max_returns_per_customer || 5,
        allow_opened_items !== undefined ? allow_opened_items : false,
        allow_used_items !== undefined ? allow_used_items : false,
        require_condition_check !== undefined ? require_condition_check : true,
        allow_cash_refund !== undefined ? allow_cash_refund : true,
        allow_card_refund !== undefined ? allow_card_refund : true,
        allow_mobile_refund !== undefined ? allow_mobile_refund : true,
        allow_store_credit !== undefined ? allow_store_credit : true,
        default_refund_method || 'cash',
        notify_manager !== undefined ? notify_manager : true,
        high_value_notification || 500,
        email_report !== undefined ? email_report : false,
        req.user.user_id
      ]
    );

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'UPDATE_SETTINGS',
      action_details: 'Updated return settings',
      affected_table: 'return_settings',
      affected_record_id: result.rows[0].id
    });

    return res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    console.error('[settings/updateReturnSettings]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update return settings.' });
  }
};

// ============================================================
// PROMOTIONS SETTINGS
// ============================================================

const getAllPromotions = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             COUNT(DISTINCT pc.customer_id) AS customer_count,
             COUNT(DISTINCT pu.usage_id) AS usage_count
      FROM promotions p
      LEFT JOIN promotion_customers pc ON p.promotion_id = pc.promotion_id
      LEFT JOIN promotion_usage pu ON p.promotion_id = pu.promotion_id
      GROUP BY p.promotion_id
      ORDER BY p.created_at DESC
    `);
    return res.json({ success: true, promotions: result.rows });
  } catch (err) {
    console.error('[settings/getAllPromotions]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch promotions.' });
  }
};

const getPromotionById = async (req, res) => {
  try {
    const promotionId = req.params.id;
    const result = await pool.query(
      `SELECT * FROM promotions WHERE promotion_id = $1`,
      [promotionId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }
    const customers = await pool.query(
      `SELECT customer_id FROM promotion_customers WHERE promotion_id = $1`,
      [promotionId]
    );
    return res.json({
      success: true,
      promotion: result.rows[0],
      customers: customers.rows.map(c => c.customer_id)
    });
  } catch (err) {
    console.error('[settings/getPromotionById]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch promotion.' });
  }
};

const createPromotion = async (req, res) => {
  const {
    name,
    description,
    discount_type,
    discount_value,
    applies_to,
    min_purchase,
    start_date,
    end_date,
    customer_ids
  } = req.body;

  if (!name || discount_value == null || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Name, discount value, start date and end date are required.'
    });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Start date cannot be after end date.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO promotions (
        name, description, discount_type, discount_value,
        applies_to, min_purchase, start_date, end_date,
        is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9) RETURNING *`,
      [
        name,
        description || null,
        discount_type || 'percentage',
        discount_value,
        applies_to || 'all',
        min_purchase || 0,
        start_date,
        end_date,
        req.user.user_id
      ]
    );

    const promotion = result.rows[0];

    // Add customers if specific
    if (customer_ids && Array.isArray(customer_ids) && customer_ids.length > 0) {
      for (const customerId of customer_ids) {
        await client.query(
          `INSERT INTO promotion_customers (promotion_id, customer_id)
           VALUES ($1, $2)`,
          [promotion.promotion_id, customerId]
        );
      }
    }

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CREATE_PROMOTION',
      action_details: `Created promotion: ${name}`,
      affected_table: 'promotions',
      affected_record_id: promotion.promotion_id
    });

    return res.status(201).json({
      success: true,
      message: 'Promotion created successfully.',
      promotion: promotion
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[settings/createPromotion]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create promotion.' });
  } finally {
    client.release();
  }
};

const updatePromotion = async (req, res) => {
  const promotionId = req.params.id;
  const {
    name,
    description,
    discount_type,
    discount_value,
    applies_to,
    min_purchase,
    start_date,
    end_date,
    is_active,
    customer_ids
  } = req.body;

  if (!name || discount_value == null || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Name, discount value, start date and end date are required.'
    });
  }

  if (new Date(start_date) > new Date(end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Start date cannot be after end date.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE promotions 
       SET name = $1,
           description = $2,
           discount_type = $3,
           discount_value = $4,
           applies_to = $5,
           min_purchase = $6,
           start_date = $7,
           end_date = $8,
           is_active = $9,
           updated_at = NOW()
       WHERE promotion_id = $10
       RETURNING *`,
      [
        name,
        description || null,
        discount_type || 'percentage',
        discount_value,
        applies_to || 'all',
        min_purchase || 0,
        start_date,
        end_date,
        is_active !== undefined ? is_active : true,
        promotionId
      ]
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }

    // Update customers
    await client.query(`DELETE FROM promotion_customers WHERE promotion_id = $1`, [promotionId]);

    if (customer_ids && Array.isArray(customer_ids) && customer_ids.length > 0) {
      for (const customerId of customer_ids) {
        await client.query(
          `INSERT INTO promotion_customers (promotion_id, customer_id)
           VALUES ($1, $2)`,
          [promotionId, customerId]
        );
      }
    }

    await client.query('COMMIT');

    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'UPDATE_PROMOTION',
      action_details: `Updated promotion: ${name}`,
      affected_table: 'promotions',
      affected_record_id: promotionId
    });

    return res.json({
      success: true,
      message: 'Promotion updated successfully.',
      promotion: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[settings/updatePromotion]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update promotion.' });
  } finally {
    client.release();
  }
};

const deletePromotion = async (req, res) => {
  try {
    const promotionId = req.params.id;
    const result = await pool.query(
      `DELETE FROM promotions WHERE promotion_id = $1 RETURNING *`,
      [promotionId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Promotion not found.' });
    }
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'DELETE_PROMOTION',
      action_details: `Deleted promotion: ${result.rows[0].name}`,
      affected_table: 'promotions',
      affected_record_id: promotionId
    });
    return res.json({
      success: true,
      message: 'Promotion deleted successfully.'
    });
  } catch (err) {
    console.error('[settings/deletePromotion]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete promotion.' });
  }
};

module.exports = {
  getWholesaleSettings,
  updateWholesaleSettings,
  getDiscountTiers,
  updateDiscountTiers,
  getReturnSettings,
  updateReturnSettings,
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion
};