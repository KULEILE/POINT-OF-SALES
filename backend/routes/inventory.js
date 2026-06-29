const router = require('express').Router();
const c = require('../controllers/inventory');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/status', protect, c.getStatus);
router.get('/low-stock', protect, c.getLowStock);
router.get('/expired', protect, allowRoles('admin','manager'), c.getExpiredProducts);
router.get('/movements', protect, c.getMovements);
router.post('/adjust', protect, allowRoles('admin','manager'), c.adjust);
router.post('/bulk-adjust', protect, allowRoles('admin','manager'), c.bulkAdjust);
router.post('/transfer', protect, allowRoles('admin','manager'), c.transferStock);
router.post('/report-expired', protect, allowRoles('admin','manager'), c.reportExpired);

module.exports = router;