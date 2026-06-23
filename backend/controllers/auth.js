const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool   = require('../config/db');
const { auditLog } = require('../utils/helpers');

// POST /api/auth/login
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT user_id, username, password_hash, full_name, email, role, status, last_login
       FROM users WHERE username = $1 LIMIT 1`,
      [username.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account is inactive. Contact your administrator.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid username or password.' });

    await pool.query(`UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE user_id = $1`, [user.user_id]);
    await auditLog(pool, { user_id: user.user_id, username: user.username, action_type: 'LOGIN', action_details: 'User logged in', affected_table: 'users', affected_record_id: user.user_id });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, full_name: user.full_name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { user_id: user.user_id, username: user.username, full_name: user.full_name, email: user.email, role: user.role, last_login: user.last_login },
    });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// POST /api/auth/register — admin only
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { username, password, full_name, email, phone, role } = req.body;
  const validRoles = ['admin', 'manager', 'cashier', 'auditor'];
  if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: `Invalid role. Must be: ${validRoles.join(', ')}` });

  try {
    const exists = await pool.query(`SELECT user_id FROM users WHERE username = $1`, [username.trim().toLowerCase()]);
    if (exists.rows.length > 0) return res.status(409).json({ success: false, message: 'Username already taken.' });

    if (email) {
      const emailExists = await pool.query(`SELECT user_id FROM users WHERE email = $1`, [email.trim().toLowerCase()]);
      if (emailExists.rows.length > 0) return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10));
    const created_by    = req.user ? req.user.user_id : null;

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, phone, role, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7)
       RETURNING user_id, username, full_name, email, phone, role, status, created_at`,
      [username.trim().toLowerCase(), password_hash, full_name.trim(), email ? email.trim().toLowerCase() : null, phone || null, role, created_by]
    );

    const newUser = result.rows[0];
    await auditLog(pool, { user_id: created_by, username: req.user?.username || 'system', action_type: 'CREATE_USER', action_details: `Created user: ${newUser.username} role: ${newUser.role}`, affected_table: 'users', affected_record_id: newUser.user_id });

    return res.status(201).json({ success: true, message: 'User created successfully.', user: newUser });
  } catch (err) {
    console.error('[auth/register]', err.message);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, username, full_name, email, phone, role, status, last_login, created_at FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.status(200).json({ success: true, user: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await auditLog(pool, { user_id: req.user.user_id, username: req.user.username, action_type: 'LOGOUT', action_details: 'User logged out', affected_table: 'users', affected_record_id: req.user.user_id });
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, register, getMe, logout };
