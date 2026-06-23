const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

const loginRules    = [body('username').trim().notEmpty(), body('password').notEmpty()];
const registerRules = [body('username').trim().notEmpty().isLength({min:3}), body('password').isLength({min:6}), body('full_name').trim().notEmpty(), body('role').notEmpty()];

router.post('/login',    loginRules,    c.login);
router.post('/register', protect, allowRoles('admin'), registerRules, c.register);
router.get('/me',        protect, c.getMe);
router.post('/logout',   protect, c.logout);

module.exports = router;
