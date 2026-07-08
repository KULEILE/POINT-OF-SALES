require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ============================================================
// CORS CONFIGURATION - Allow multiple frontend URLs
// ============================================================

const allowedOrigins = [
  'https://kpos-frontend.onrender.com',
  'https://point-of-sales-1-5jfu.onrender.com',
  'https://point-of-sales-1.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// REQUEST LOGGING
// ============================================================

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'K-POINT OF SALES API running',
      db: 'connected',
      time: new Date(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Database not connected',
      error: err.message
    });
  }
});

// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/holds', require('./routes/holds'));
app.use('/api/shifts', require('./routes/shifts')); // ADD THIS LINE

// ============================================================
// ROOT ROUTE
// ============================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'K-POINT OF SALES API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      products: '/api/products',
      sales: '/api/sales',
      customers: '/api/customers',
      payments: '/api/payments',
      returns: '/api/returns',
      inventory: '/api/inventory',
      suppliers: '/api/suppliers',
      reports: '/api/reports',
      users: '/api/users',
      audit: '/api/audit',
      settings: '/api/settings',
      shifts: '/api/shifts' // ADD THIS
    }
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    available_routes: [
      '/',
      '/api/health',
      '/api/auth',
      '/api/products',
      '/api/sales',
      '/api/customers',
      '/api/payments',
      '/api/returns',
      '/api/inventory',
      '/api/suppliers',
      '/api/reports',
      '/api/users',
      '/api/audit',
      '/api/settings',
      '/api/shifts' // ADD THIS
    ]
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\x1b[34m========================================\x1b[0m');
  console.log('\x1b[34m  K-POINT OF SALES API\x1b[0m');
  console.log('\x1b[34m========================================\x1b[0m');
  console.log(`\x1b[32m Port    :\x1b[0m ${PORT}`);
  console.log(`\x1b[32m API     :\x1b[0m http://localhost:${PORT}/api`);
  console.log(`\x1b[32m Health  :\x1b[0m http://localhost:${PORT}/api/health`);
  console.log(`\x1b[32m Root    :\x1b[0m http://localhost:${PORT}/`);
  console.log(`\x1b[32m CORS    :\x1b[0m Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log('\x1b[34m========================================\x1b[0m');
});

// ============================================================
// HANDLE UNHANDLED REJECTIONS
// ============================================================

process.on('unhandledRejection', (err) => {
  console.log('\x1b[31m[Unhandled Rejection]\x1b[0m', err.message);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  console.log('\x1b[31m[Uncaught Exception]\x1b[0m', err.message);
  console.error(err.stack);
  process.exit(1);
});