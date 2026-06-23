const router = require('express').Router();
const c = require('../controllers/audit');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

router.get('/', protect, allowRoles('admin','manager','auditor'), c.getAll);

module.exports = router;
