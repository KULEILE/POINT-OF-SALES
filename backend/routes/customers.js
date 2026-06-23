const router = require('express').Router();
const c = require('../controllers/customers');
const { protect } = require('../middleware/auth');

router.get('/balances', protect, c.getBalances);
router.get('/',         protect, c.getAll);
router.get('/:id',      protect, c.getById);
router.post('/',        protect, c.create);
router.put('/:id',      protect, c.update);

module.exports = router;
