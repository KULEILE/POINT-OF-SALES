const router = require('express').Router();
const c = require('../controllers/settings');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/wholesale', protect, allowRoles('admin','manager'), c.getWholesaleSettings);
router.put('/wholesale', protect, allowRoles('admin','manager'), c.updateWholesaleSettings);
router.get('/discount-tiers', protect, allowRoles('admin','manager'), c.getDiscountTiers);
router.put('/discount-tiers', protect, allowRoles('admin','manager'), c.updateDiscountTiers);

module.exports = router;