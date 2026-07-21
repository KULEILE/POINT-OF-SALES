const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise use individual variables
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  // If DATABASE_URL is provided, use it directly
  ...(connectionString ? {
    connectionString: connectionString,
  } : {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  }),
  
  // Railway requires SSL
  ssl: {
    rejectUnauthorized: false
  },

  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // Increased from 5000 to 30000 for Railway

  // Keep connection alive
  keepAlive: true,
});

// Log successful connections
pool.on('connect', () => {
  console.log('[DB] PostgreSQL connected successfully');
});

// Log pool errors
pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

// Test connection on startup
(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('[DB] Connection verified');
    console.log('[DB] Server time:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Please check your DATABASE_URL or database credentials');
  }
})();

module.exports = pool;