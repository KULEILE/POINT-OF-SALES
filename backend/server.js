require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const pool         = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/products',  require('./routes/products'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/reports',   require('./routes/reports'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/audit',     require('./routes/audit'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'K-POINT OF SALES API running', db: 'connected', time: new Date() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database not connected', error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n K-POINT OF SALES API`);
  console.log(` Port    : ${PORT}`);
  console.log(` API     : http://localhost:${PORT}/api`);
  console.log(` Health  : http://localhost:${PORT}/api/health\n`);
});
