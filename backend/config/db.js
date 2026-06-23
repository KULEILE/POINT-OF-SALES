const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,

  // Render PostgreSQL requires SSL
  ssl: {
    rejectUnauthorized: false
  },

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log successful connections
pool.on('connect', () => {
  console.log('[DB] PostgreSQL connected');
});

// Log pool errors
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

// Test connection on startup
(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('[DB] Connection verified');
    console.log('[DB] Server time:', result.rows[0].now);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
  }
})();

module.exports = pool;