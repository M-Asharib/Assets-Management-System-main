const router = require('express').Router();
const Asset  = require('../models/Asset');
const Issue  = require('../models/Issue');
const User   = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /api/categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await Asset.distinct('category');
    res.json(categories.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/locations
router.get('/locations', requireAuth, async (req, res) => {
  try {
    const locations = await Asset.distinct('location');
    res.json(locations.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/technicians
router.get('/technicians', requireAuth, async (req, res) => {
  try {
    const technicians = await User.find({ role: 'Technician' }).select('username full_name role');
    res.json(technicians);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [totalAssets, statusAgg, priorityAgg, categoryAgg, activeIssues, pendingMaintenance] = await Promise.all([
      Asset.countDocuments(),
      Asset.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Issue.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Issue.countDocuments({ status: { $nin: ['Resolved', 'Closed'] } }),
      Issue.countDocuments({ status: { $in: ['Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts'] } }),
    ]);

    const toMap = (agg) => agg.reduce((acc, r) => { acc[r._id || 'Unspecified'] = r.count; return acc; }, {});
    const operationalCount = (statusAgg.find(s => s._id === 'Operational') || {}).count || 0;

    res.json({
      total_assets: totalAssets,
      active_issues: activeIssues,
      pending_maintenance: pendingMaintenance,
      operational_rate: totalAssets ? Number(((operationalCount / totalAssets) * 100).toFixed(1)) : 0,
      status_distribution: toMap(statusAgg),
      priority_distribution: toMap(priorityAgg),
      category_distribution: toMap(categoryAgg),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
