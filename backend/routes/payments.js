const router = require('express').Router();
const c = require('../controllers/payments');
const { protect } = require('../middleware/auth');

router.post('/credit', protect, c.processCreditPayment);
router.post('/layby', protect, c.processLaybyPayment);
router.get('/customer/:id', protect, c.getCustomerPayments);
router.get('/customer/:id/layby', protect, c.getCustomerLaybys);

module.exports = router;