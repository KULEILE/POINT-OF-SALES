const router = require('express').Router();
const c = require('../controllers/sales');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.post('/', protect, c.create);
router.get('/summary/today', protect, c.todaySummary);
router.get('/receipt/:receipt_number', protect, c.getByReceipt);
router.get('/', protect, allowRoles('admin','manager','auditor'), c.getAll);
router.get('/:id', protect, c.getById);

module.exports = router;