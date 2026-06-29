const router = require('express').Router();
const c = require('../controllers/reports');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/summary', protect, c.summary);
router.get('/daily-sales', protect, allowRoles('admin','manager','auditor'), c.dailySales);
router.get('/top-products', protect, allowRoles('admin','manager','auditor'), c.topProducts);
router.get('/inventory', protect, allowRoles('admin','manager','auditor'), c.inventoryStatus);
router.get('/cashier-performance', protect, allowRoles('admin','manager','auditor'), c.cashierPerformance);
router.get('/profit-loss', protect, allowRoles('admin','manager','auditor'), c.profitLoss);
router.get('/expired-products', protect, allowRoles('admin','manager'), c.expiredProductsReport);

module.exports = router;