const router = require('express').Router();
const c = require('../controllers/users');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/',                protect, allowRoles('admin'), c.getAll);
router.get('/:id',             protect, allowRoles('admin'), c.getById);
router.put('/change-password', protect, c.changePassword);
router.put('/:id',             protect, allowRoles('admin'), c.update);
router.delete('/:id',          protect, allowRoles('admin'), c.deactivate);

module.exports = router;
