const router = require('express').Router();
const User   = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/users (Admin only)
router.get('/', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users (Admin only — used to create Admin/Supervisor/Technician accounts)
router.post('/', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const exists = await User.findOne({ username: req.body.username });
    if (exists) return res.status(400).json({ error: `Username "${req.body.username}" already exists.` });
    const user = new User(req.body);
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
