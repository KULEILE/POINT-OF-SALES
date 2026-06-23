const pool = require('../config/db');

const getAll = async (req, res) => {
  const { action_type, username, date_from, date_to, page=1, limit=30 } = req.query;
  const offset = (parseInt(page,10)-1) * parseInt(limit,10);
  try {
    let q = `SELECT * FROM audit_trail WHERE 1=1`;
    const params = [];
    if (action_type) { params.push(`%${action_type}%`); q += ` AND action_type ILIKE $${params.length}`; }
    if (username)    { params.push(`%${username}%`);    q += ` AND username ILIKE $${params.length}`; }
    if (date_from)   { params.push(date_from);          q += ` AND DATE(created_at)>=$${params.length}`; }
    if (date_to)     { params.push(date_to);            q += ` AND DATE(created_at)<=$${params.length}`; }
    q += ` ORDER BY created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(parseInt(limit,10), offset);
    const result = await pool.query(q, params);
    return res.json({ success: true, logs: result.rows, count: result.rowCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

module.exports = { getAll };
