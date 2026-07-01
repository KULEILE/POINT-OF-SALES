const router = require('express').Router();
const c = require('../controllers/settings');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

// Wholesale settings
router.get('/wholesale', protect, allowRoles('admin','manager'), c.getWholesaleSettings);
router.put('/wholesale', protect, allowRoles('admin','manager'), c.updateWholesaleSettings);

// Discount tiers
router.get('/discount-tiers', protect, allowRoles('admin','manager'), c.getDiscountTiers);
router.put('/discount-tiers', protect, allowRoles('admin','manager'), c.updateDiscountTiers);

// Return settings
router.get('/return', protect, allowRoles('admin','manager'), c.getReturnSettings);
router.put('/return', protect, allowRoles('admin','manager'), c.updateReturnSettings);

module.exports = router;