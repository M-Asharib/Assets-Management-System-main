const router = require('express').Router();
const Log    = require('../models/Log');

// GET /api/logs  (newest first)
router.get('/', async (req, res) => {
  try {
    const { asset_id } = req.query;
    const filter = {};
    if (asset_id) filter.asset_id = asset_id;
    const logs = await Log.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/logs
router.post('/', async (req, res) => {
  try {
    const log = new Log(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
