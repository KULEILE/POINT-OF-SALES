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

// Promotions - Admin endpoints
router.get('/promotions', protect, allowRoles('admin','manager'), c.getAllPromotions);
router.get('/promotions/:id', protect, allowRoles('admin','manager'), c.getPromotionById);
router.post('/promotions', protect, allowRoles('admin','manager'), c.createPromotion);
router.put('/promotions/:id', protect, allowRoles('admin','manager'), c.updatePromotion);
router.delete('/promotions/:id', protect, allowRoles('admin','manager'), c.deletePromotion);

// Promotions - Frontend endpoints
router.get('/promotions/active', protect, c.getActivePromotionsForFrontend);
router.post('/promotions/calculate', protect, c.calculateCartPromotion);
router.get('/promotions/product/:product_id', protect, c.checkProductPromotions);

module.exports = router;