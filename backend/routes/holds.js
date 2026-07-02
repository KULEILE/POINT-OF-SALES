const router = require('express').Router();
const c = require('../controllers/holds');
const { protect } = require('../middleware/auth');

router.post('/', protect, c.create);
router.get('/', protect, c.getAll);
router.get('/:id', protect, c.getById);
router.put('/:id/resume', protect, c.resume);
router.delete('/:id', protect, c.remove);

module.exports = router;