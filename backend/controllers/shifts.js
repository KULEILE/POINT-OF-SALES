const pool = require('../config/db');
const { auditLog } = require('../utils/helpers');

// ============================================================
// SHIFT MANAGEMENT
// ============================================================

/**
 * Get current open shift for the logged-in user
 */
const getCurrentShift = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
              u.full_name as cashier_name,
              COUNT(DISTINCT t.transaction_id) as transaction_count,
              COALESCE(SUM(t.total_amount), 0) as sales_total
       FROM shifts s
       LEFT JOIN users u ON s.user_id = u.user_id
       LEFT JOIN transactions t ON s.shift_id = t.shift_id AND t.status = 'completed'
       WHERE s.user_id = $1 AND s.status = 'open'
       GROUP BY s.shift_id, u.full_name`,
      [req.user.user_id]
    );
    
    return res.json({
      success: true,
      shift: result.rows[0] || null
    });
  } catch (err) {
    console.error('[shifts/getCurrentShift]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get current shift.'
    });
  }
};

/**
 * Clock in - Start a new shift
 */
const clockIn = async (req, res) => {
  const { starting_float, notes } = req.body;
  
  // Check if user already has an open shift
  try {
    const existing = await pool.query(
      `SELECT shift_id FROM shifts WHERE user_id = $1 AND status = 'open'`,
      [req.user.user_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have an open shift. Please clock out first.'
      });
    }
  } catch (err) {
    console.error('[shifts/clockIn] Check existing error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to check existing shift.'
    });
  }
  
  try {
    const float = parseFloat(starting_float) || 0;
    
    const result = await pool.query(
      `INSERT INTO shifts (
        user_id, clock_in, starting_float, status, notes
      ) VALUES ($1, NOW(), $2, 'open', $3) RETURNING *`,
      [req.user.user_id, float, notes || null]
    );
    
    const shift = result.rows[0];
    
    // Audit log
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CLOCK_IN',
      action_details: `Clocked in - Shift #${shift.shift_id} (Starting float: ${float})`,
      affected_table: 'shifts',
      affected_record_id: shift.shift_id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Clocked in successfully.',
      shift: shift
    });
  } catch (err) {
    console.error('[shifts/clockIn]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to clock in.'
    });
  }
};

/**
 * Clock out - End current shift
 */
const clockOut = async (req, res) => {
  const { ending_cash, notes } = req.body;
  
  try {
    // Get current open shift
    const shiftResult = await pool.query(
      `SELECT s.*, 
              COUNT(DISTINCT t.transaction_id) as transaction_count,
              COALESCE(SUM(t.total_amount), 0) as sales_total
       FROM shifts s
       LEFT JOIN transactions t ON s.shift_id = t.shift_id AND t.status = 'completed'
       WHERE s.user_id = $1 AND s.status = 'open'
       GROUP BY s.shift_id`,
      [req.user.user_id]
    );
    
    if (!shiftResult.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'No open shift found. Please clock in first.'
      });
    }
    
    const shift = shiftResult.rows[0];
    const endingCash = parseFloat(ending_cash) || 0;
    const salesTotal = parseFloat(shift.sales_total) || 0;
    const startingFloat = parseFloat(shift.starting_float) || 0;
    const expectedCash = startingFloat + salesTotal;
    const difference = endingCash - expectedCash;
    
    // Update shift
    const result = await pool.query(
      `UPDATE shifts 
       SET clock_out = NOW(),
           ending_cash = $1,
           expected_cash = $2,
           difference = $3,
           sales_total = $4,
           transaction_count = $5,
           status = 'closed',
           notes = COALESCE(notes, $6)
       WHERE shift_id = $7
       RETURNING *`,
      [
        endingCash,
        expectedCash,
        difference,
        salesTotal,
        shift.transaction_count,
        notes || shift.notes,
        shift.shift_id
      ]
    );
    
    const closedShift = result.rows[0];
    
    // Audit log
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'CLOCK_OUT',
      action_details: `Clocked out - Shift #${closedShift.shift_id} (Sales: ${salesTotal}, Cash: ${endingCash}, Diff: ${difference})`,
      affected_table: 'shifts',
      affected_record_id: closedShift.shift_id
    });
    
    return res.json({
      success: true,
      message: 'Clocked out successfully.',
      shift: closedShift
    });
  } catch (err) {
    console.error('[shifts/clockOut]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to clock out.'
    });
  }
};

/**
 * Get all shifts with filters (Admin/Manager only)
 */
const getAllShifts = async (req, res) => {
  const { user_id, status, date_from, date_to, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let query = `
      SELECT s.*,
             u.full_name as cashier_name,
             COUNT(DISTINCT t.transaction_id) as transaction_count,
             COALESCE(SUM(t.total_amount), 0) as sales_total
      FROM shifts s
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN transactions t ON s.shift_id = t.shift_id AND t.status = 'completed'
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (user_id) {
      paramCount++;
      query += ` AND s.user_id = $${paramCount}`;
      params.push(user_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
    }
    
    if (date_from) {
      paramCount++;
      query += ` AND DATE(s.clock_in) >= $${paramCount}`;
      params.push(date_from);
    }
    
    if (date_to) {
      paramCount++;
      query += ` AND DATE(s.clock_in) <= $${paramCount}`;
      params.push(date_to);
    }
    
    query += ` GROUP BY s.shift_id, u.full_name ORDER BY s.clock_in DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await pool.query(query, params);
    
    return res.json({
      success: true,
      shifts: result.rows,
      count: result.rowCount
    });
  } catch (err) {
    console.error('[shifts/getAllShifts]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts.'
    });
  }
};

/**
 * Get shift details by ID
 */
const getShiftById = async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT s.*,
              u.full_name as cashier_name,
              (SELECT COUNT(*) FROM transactions WHERE shift_id = s.shift_id AND status = 'completed') as transaction_count,
              (SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE shift_id = s.shift_id AND status = 'completed') as sales_total
       FROM shifts s
       LEFT JOIN users u ON s.user_id = u.user_id
       WHERE s.shift_id = $1`,
      [id]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found.'
      });
    }
    
    // Get transactions for this shift
    const transactions = await pool.query(
      `SELECT t.*,
              c.full_name as customer_name
       FROM transactions t
       LEFT JOIN customers c ON t.customer_id = c.customer_id
       WHERE t.shift_id = $1
       ORDER BY t.transaction_date DESC`,
      [id]
    );
    
    return res.json({
      success: true,
      shift: result.rows[0],
      transactions: transactions.rows
    });
  } catch (err) {
    console.error('[shifts/getShiftById]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shift details.'
    });
  }
};

/**
 * Reconcile shift (Manager only)
 */
const reconcileShift = async (req, res) => {
  const { id } = req.params;
  const { ending_cash, notes } = req.body;
  
  try {
    const shiftResult = await pool.query(
      `SELECT * FROM shifts WHERE shift_id = $1`,
      [id]
    );
    
    if (!shiftResult.rows[0]) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found.'
      });
    }
    
    const shift = shiftResult.rows[0];
    const endingCash = parseFloat(ending_cash) || parseFloat(shift.ending_cash) || 0;
    const salesTotal = parseFloat(shift.sales_total) || 0;
    const startingFloat = parseFloat(shift.starting_float) || 0;
    const expectedCash = startingFloat + salesTotal;
    const difference = endingCash - expectedCash;
    
    const result = await pool.query(
      `UPDATE shifts 
       SET ending_cash = $1,
           expected_cash = $2,
           difference = $3,
           status = 'reconciled',
           notes = COALESCE(notes, $4)
       WHERE shift_id = $5
       RETURNING *`,
      [endingCash, expectedCash, difference, notes || shift.notes, id]
    );
    
    // Audit log
    await auditLog(pool, {
      user_id: req.user.user_id,
      username: req.user.username,
      action_type: 'RECONCILE_SHIFT',
      action_details: `Reconciled Shift #${id} (Cash: ${endingCash}, Expected: ${expectedCash}, Diff: ${difference})`,
      affected_table: 'shifts',
      affected_record_id: id
    });
    
    return res.json({
      success: true,
      message: 'Shift reconciled successfully.',
      shift: result.rows[0]
    });
  } catch (err) {
    console.error('[shifts/reconcileShift]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reconcile shift.'
    });
  }
};

/**
 * Get shift summary for dashboard
 */
const getShiftSummary = async (req, res) => {
  const { user_id } = req.query;
  const targetUserId = user_id || req.user.user_id;
  
  try {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_shifts,
         COALESCE(SUM(sales_total), 0) as total_sales,
         COALESCE(AVG(sales_total), 0) as avg_sales,
         COALESCE(SUM(difference), 0) as total_difference,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_shifts,
         COUNT(CASE WHEN status = 'reconciled' THEN 1 END) as reconciled_shifts
       FROM shifts
       WHERE user_id = $1
       AND status != 'open'`,
      [targetUserId]
    );
    
    return res.json({
      success: true,
      summary: result.rows[0]
    });
  } catch (err) {
    console.error('[shifts/getShiftSummary]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get shift summary.'
    });
  }
};

module.exports = {
  getCurrentShift,
  clockIn,
  clockOut,
  getAllShifts,
  getShiftById,
  reconcileShift,
  getShiftSummary
};