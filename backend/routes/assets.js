const router = require('express').Router();
const Asset = require('../models/Asset');
const Log   = require('../models/Log');
const { requireAuth, requireRole } = require('../middleware/auth');

// Helper: generate unique asset code
function genCode(category) {
  const prefix = category
    ? category.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 3)
    : 'AC';
  const num  = Math.floor(1000 + Math.random() * 9000);
  const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `#${prefix}-${num}-${char}`;
}

// GET /api/assets (internal listing — requires login)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, category, status, skip, limit } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name:       { $regex: q, $options: 'i' } },
        { asset_code: { $regex: q, $options: 'i' } },
        { location:   { $regex: q, $options: 'i' } },
      ];
    }
    if (category) filter.category = category;
    if (status)   filter.status   = status;

    const total = await Asset.countDocuments(filter);
    let query = Asset.find(filter).sort({ createdAt: -1 });
    if (skip)  query = query.skip(Number(skip));
    if (limit) query = query.limit(Number(limit));

    const assets = await query;
    res.set('X-Total-Count', String(total));
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/assets/:id (internal detail — requires login; public asset page uses a separate safe route)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assets
router.post('/', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    let code = (req.body.asset_code || '').trim();
    if (!code) {
      // generate unique code
      let attempts = 0;
      do {
        code = genCode(req.body.category);
        attempts++;
      } while (await Asset.findOne({ asset_code: code }) && attempts < 10);
    } else {
      const dup = await Asset.findOne({ asset_code: code });
      if (dup) return res.status(400).json({ error: `Duplicate asset code: ${code}` });
    }

    const asset = new Asset({ ...req.body, asset_code: code });
    await asset.save();

    // Log
    await new Log({
      asset_id: asset._id,
      actor: req.body.actor || 'Admin',
      action: 'Registered',
      details: `Asset registered with code ${code}.`,
    }).save();

    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/assets/:id
router.put('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await new Log({
      asset_id: asset._id,
      actor: req.body.actor || 'Admin',
      action: 'Updated',
      details: req.body.details || 'Asset record updated.',
    }).save();

    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/assets/:id
router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await new Log({
      asset_id: asset._id,
      actor: req.body?.actor || 'Admin',
      action: 'Deleted',
      details: `Asset ${asset.asset_code} permanently deleted.`,
    }).save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
