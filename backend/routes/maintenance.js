const router      = require('express').Router();
const Maintenance = require('../models/Maintenance');
const Asset       = require('../models/Asset');
const Log         = require('../models/Log');
const { requireAuth } = require('../middleware/auth');

// GET /api/maintenance (internal — requires login)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { asset_id } = req.query;
    const filter = {};
    if (asset_id) filter.asset_id = asset_id;
    const records = await Maintenance.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/maintenance/:id (internal — requires login)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const record = await Maintenance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/maintenance (internal — requires login)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.body.cost != null && Number(req.body.cost) < 0) {
      return res.status(400).json({ error: 'Maintenance cost cannot be negative.' });
    }
    if (req.body.next_service_date && req.body.end_date &&
        new Date(req.body.next_service_date) < new Date(req.body.end_date)) {
      return res.status(400).json({ error: 'Next service date cannot be before the maintenance completion date.' });
    }

    const record = new Maintenance(req.body);
    await record.save();

    // Update asset status to Under Maintenance while in progress
    if (req.body.asset_id && req.body.status === 'In Progress') {
      await Asset.findByIdAndUpdate(req.body.asset_id, { status: 'Under Maintenance' });
    }

    await new Log({
      asset_id: req.body.asset_id || null,
      actor: req.body.technician_name || 'Technician',
      action: 'Maintenance Logged',
      details: `Maintenance record created. Cost: $${req.body.cost || 0}. Notes: ${req.body.notes || ''}`,
    }).save();

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/maintenance/:id (internal — requires login)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    if (req.body.cost != null && Number(req.body.cost) < 0) {
      return res.status(400).json({ error: 'Maintenance cost cannot be negative.' });
    }
    if (req.body.next_service_date && req.body.end_date &&
        new Date(req.body.next_service_date) < new Date(req.body.end_date)) {
      return res.status(400).json({ error: 'Next service date cannot be before the maintenance completion date.' });
    }

    const record = await Maintenance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
