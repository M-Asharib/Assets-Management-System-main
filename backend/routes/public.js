const router = require('express').Router();
const Asset  = require('../models/Asset');
const Log    = require('../models/Log');

// GET /public/asset/:code — safe, unauthenticated asset page
router.get('/asset/:code', async (req, res) => {
  try {
    const asset = await Asset.findOne({ asset_code: req.params.code });
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found. Check the code and try again.' });
    }

    const recentActivity = await Log.find({ asset_id: asset._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('action createdAt -_id');

    res.json({
      asset_code: asset.asset_code,
      name: asset.name,
      category: asset.category,
      location: asset.location,
      condition: asset.condition,
      status: asset.status,
      last_service_date: asset.last_service_date,
      next_service_date: asset.next_service_date,
      retired: asset.status === 'Retired',
      recent_activity: recentActivity.map(l => ({ action: l.action, date: l.createdAt })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
