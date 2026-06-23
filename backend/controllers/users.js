const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { auditLog } = require('../utils/helpers');

const getAll = async (req, res) => {
  try {
    const result = await pool.query(`SELECT user_id,uuid,username,full_name,email,phone,role,status,last_login,created_at FROM users ORDER BY full_name ASC`);
    return res.json({ success: true, users: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getById = async (req, res) => {
  try {
    const result = await pool.query(`SELECT user_id,uuid,username,full_name,email,phone,role,status,last_login,created_at FROM users WHERE user_id=$1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const update = async (req, res) => {
  const allowed = ['full_name','email','phone','role','status'];
  const updates = []; const values = [];
  allowed.forEach(k => { if (req.body[k] !== undefined) { values.push(req.body[k]); updates.push(`${k}=$${values.length}`); } });
  if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update.' });
  values.push(req.params.id);
  try {
    const old = await pool.query(`SELECT user_id,full_name,role,status FROM users WHERE user_id=$1`, [req.params.id]);
    const result = await pool.query(`UPDATE users SET ${updates.join(',')},updated_at=NOW() WHERE user_id=$${values.length} RETURNING user_id,username,full_name,email,phone,role,status`, values);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found.' });
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'UPDATE_USER', action_details: `Updated user: ${result.rows[0].username}`, affected_table: 'users', affected_record_id: result.rows[0].user_id, old_values: old.rows[0], new_values: result.rows[0] });
    return res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
};

const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ success: false, message: 'Both passwords are required.' });
  if (new_password.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  try {
    const result = await pool.query(`SELECT password_hash FROM users WHERE user_id=$1`, [req.user.user_id]);
    const match  = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    const hash = await bcrypt.hash(new_password, parseInt(process.env.BCRYPT_ROUNDS, 10));
    await pool.query(`UPDATE users SET password_hash=$1,updated_at=NOW() WHERE user_id=$2`, [hash, req.user.user_id]);
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'CHANGE_PASSWORD', action_details: 'Password changed', affected_table: 'users', affected_record_id: req.user.user_id });
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
};

const deactivate = async (req, res) => {
  if (parseInt(req.params.id,10) === req.user.user_id) return res.status(400).json({ success: false, message: 'You cannot deactivate yourself.' });
  try {
    const result = await pool.query(`UPDATE users SET status='inactive',updated_at=NOW() WHERE user_id=$1 RETURNING username`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found.' });
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'DEACTIVATE_USER', action_details: `Deactivated: ${result.rows[0].username}`, affected_table: 'users', affected_record_id: req.params.id });
    return res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAll, getById, update, changePassword, deactivate };
