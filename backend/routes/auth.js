const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

const registerRules = [
  body('username').trim().notEmpty().isLength({ min: 3 }).withMessage('Username must be at least 3 characters.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('full_name').trim().notEmpty().withMessage('Full name is required.'),
  body('role').notEmpty().withMessage('Role is required.'),
];

// PUBLIC — no token needed
router.post('/login',    loginRules,    c.login);
router.post('/register', registerRules, c.register);

// PROTECTED — token required
router.get('/me',        protect, c.getMe);
router.post('/logout',   protect, c.logout);

// Admin adds staff from dashboard — protected
router.post('/create-user', protect, allowRoles('admin'), registerRules, c.register);

module.exports = router;