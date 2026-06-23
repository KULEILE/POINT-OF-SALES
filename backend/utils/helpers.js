const formatCurrency = (amount, symbol = 'M') =>
  `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;

const paginate = (page = 1, limit = 20) => ({
  limit: parseInt(limit, 10),
  offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
});

const auditLog = async (pool, { user_id, username, action_type, action_details, affected_table, affected_record_id, old_values, new_values }) => {
  try {
    await pool.query(
      `INSERT INTO audit_trail
        (user_id, username, action_type, action_details, affected_table, affected_record_id, old_values, new_values)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [user_id, username, action_type, action_details, affected_table, affected_record_id,
       old_values ? JSON.stringify(old_values) : null,
       new_values ? JSON.stringify(new_values) : null]
    );
  } catch (err) {
    console.error('[AUDIT]', err.message);
  }
};

module.exports = { formatCurrency, paginate, auditLog };
