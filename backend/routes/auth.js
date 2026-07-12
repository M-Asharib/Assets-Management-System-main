require('dotenv').config();
const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { JWT_SECRET, requireAuth, requireRole } = require('../middleware/auth');

const JWT_EXPIRES = '7d';

// ─── Helper: sign token ───────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Public self-registration always creates a Technician account.
// Admin/Supervisor accounts can only be created by an existing Admin via POST /api/users.
router.post('/register', async (req, res) => {
  try {
    const { username, password, full_name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ username: username.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: `Username "${username}" is already taken.` });
    }

    const user = await User.create({
      username: username.trim().toLowerCase(),
      password,
      full_name: full_name || username,
      role: 'Technician',
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Fetch user WITH password (normally excluded by select:false)
    const user = await User.findOne({ username: username.trim().toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ id: user._id, username: user.username, full_name: user.full_name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
