const router = require('express').Router();
const c = require('../controllers/payments');
const { protect } = require('../middleware/auth');

router.post('/credit', protect, c.processCreditPayment);
router.post('/layby', protect, c.processLaybyPayment);
router.post('/split', protect, c.processSplitPayment);
router.get('/splits/:id', protect, c.getPaymentSplits);
router.get('/customer/:id', protect, c.getCustomerPayments);
router.get('/customer/:id/layby', protect, c.getCustomerLaybys);

module.exports = router;