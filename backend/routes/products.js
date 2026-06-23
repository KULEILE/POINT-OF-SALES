const router = require('express').Router();
const c = require('../controllers/products');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/',                 protect, c.getAll);
router.get('/low-stock',        protect, c.getLowStock);
router.get('/categories',       protect, c.getCategories);
router.get('/barcode/:barcode', protect, c.getByBarcode);
router.get('/:id',              protect, c.getById);
router.post('/',                protect, allowRoles('admin','manager'), c.create);
router.put('/:id',              protect, allowRoles('admin','manager'), c.update);

module.exports = router;
