const router = require('express').Router();
const c = require('../controllers/shifts');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

// All shift routes require authentication
router.use(protect);

// Current shift
router.get('/current', c.getCurrentShift);

// Clock in/out
router.post('/clock-in', c.clockIn);
router.post('/clock-out', c.clockOut);

// Shift summary
router.get('/summary', c.getShiftSummary);

// Admin/Manager only routes
router.get('/', allowRoles('admin', 'manager'), c.getAllShifts);
router.get('/:id', allowRoles('admin', 'manager'), c.getShiftById);
router.post('/:id/reconcile', allowRoles('admin', 'manager'), c.reconcileShift);

module.exports = router;