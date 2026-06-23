const router = require('express').Router();
const c = require('../controllers/inventory');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/status',    protect, c.getStatus);
router.get('/low-stock', protect, c.getLowStock);
router.get('/movements', protect, c.getMovements);
router.post('/adjust',   protect, allowRoles('admin','manager'), c.adjust);

module.exports = router;
