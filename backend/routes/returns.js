const router = require('express').Router();
const c = require('../controllers/returns');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.post('/', protect, allowRoles('admin','manager','cashier'), c.create);
router.get('/transaction/:id', protect, c.getByTransaction);
router.get('/customer/:id', protect, c.getByCustomer);
router.get('/:id', protect, c.getById);
router.get('/', protect, allowRoles('admin','manager','auditor'), c.getAll);

module.exports = router;