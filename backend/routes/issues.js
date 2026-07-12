const router      = require('express').Router();
const Issue       = require('../models/Issue');
const Asset       = require('../models/Asset');
const Log         = require('../models/Log');
const Maintenance = require('../models/Maintenance');
const { requireAuth } = require('../middleware/auth');

function genIssueNumber() {
  return `#REQ-${Math.floor(1000 + Math.random() * 9000)}`;
}

// Allowed issue-status transitions (brief §5.2)
const ALLOWED_TRANSITIONS = {
  'Reported':                ['Assigned'],
  'Assigned':                ['Inspection Started'],
  'Inspection Started':      ['Maintenance In Progress', 'Waiting for Parts'],
  'Maintenance In Progress': ['Waiting for Parts', 'Resolved'],
  'Waiting for Parts':       ['Maintenance In Progress'],
  'Resolved':                ['Closed', 'Reopened'],
  'Closed':                  ['Reopened'],
  'Reopened':                ['Assigned', 'Inspection Started'],
};

// GET /api/issues (internal listing — requires login)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { asset_id, technician_id, status } = req.query;
    const filter = {};
    if (asset_id)      filter.asset_id      = asset_id;
    if (technician_id) filter.technician_id = technician_id;
    if (status)        filter.status        = status;
    const issues = await Issue.find(filter).sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/issues/:id (internal detail — requires login)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/issues (public — anyone can report an issue against an asset, no login required)
router.post('/', async (req, res) => {
  try {
    let { asset_id, asset_code, ...rest } = req.body;

    if (!asset_id && asset_code) {
      const asset = await Asset.findOne({ asset_code });
      if (!asset) return res.status(404).json({ error: 'Asset not found.' });
      if (asset.status === 'Retired') {
        return res.status(400).json({ error: 'This asset is retired and can no longer accept issue reports.' });
      }
      asset_id = asset._id;
    }
    if (!asset_id) return res.status(400).json({ error: 'asset_id or asset_code is required.' });

    let num = req.body.issue_number;
    if (!num) {
      let attempts = 0;
      do {
        num = genIssueNumber();
        attempts++;
      } while (await Issue.findOne({ issue_number: num }) && attempts < 10);
    }

    const issue = new Issue({ ...rest, asset_id, issue_number: num });
    await issue.save();

    await Asset.findByIdAndUpdate(asset_id, { status: 'Issue Reported' });
    await new Log({
      asset_id,
      actor: rest.reporter_name || 'Reporter',
      action: 'Issue Reported',
      details: `Filed issue ticket ${num}: ${rest.title}`,
    }).save();

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/issues/:id (internal — requires login; only Admin/Supervisor or the assigned technician may update)
router.put('/:id', requireAuth, async (req, res) => {
  const existing = await Issue.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });

  const { role, id: userId } = req.user;
  const isAssignedTechnician = existing.technician_id && String(existing.technician_id) === String(userId);
  if (role === 'Technician' && !isAssignedTechnician) {
    return res.status(403).json({ error: 'Technicians may only update issues assigned to them.' });
  }

  if (existing.status === 'Closed' && req.body.status !== 'Reopened') {
    return res.status(400).json({ error: 'A closed issue cannot be edited until it is reopened.' });
  }

  if (req.body.status && req.body.status !== existing.status) {
    const allowedNext = ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(req.body.status)) {
      return res.status(400).json({
        error: `Cannot move issue from "${existing.status}" to "${req.body.status}".`,
      });
    }
  }

  if (req.body.status === 'Resolved') {
    const hasMaintenanceNote = await Maintenance.exists({ issue_id: existing._id, notes: { $ne: '' } });
    if (!hasMaintenanceNote) {
      return res.status(400).json({ error: 'A maintenance note is required before resolving an issue.' });
    }
  }

  try {
    const issue = await Issue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    // Log the status change
    const actor = req.body.actor || 'Admin';
    const action = req.body.status ? `Status → ${req.body.status}` : 'Issue Updated';
    await new Log({
      asset_id: issue.asset_id,
      actor,
      action,
      details: req.body.details || `Issue ${issue.issue_number} updated.`,
    }).save();

    // Reflect issue-status events onto the asset's status (brief §5.1)
    if (req.body.status === 'Inspection Started') {
      await Asset.findByIdAndUpdate(issue.asset_id, { status: 'Under Inspection' });
    } else if (req.body.status === 'Maintenance In Progress') {
      await Asset.findByIdAndUpdate(issue.asset_id, { status: 'Under Maintenance' });
    } else if (issue.priority === 'Critical' && ['Inspection Started', 'Maintenance In Progress'].includes(req.body.status)) {
      await Asset.findByIdAndUpdate(issue.asset_id, { status: 'Out of Service' });
    }

    // If resolved/closed, try to set asset back to Operational
    if (['Resolved','Closed'].includes(req.body.status)) {
      const openIssues = await Issue.find({
        asset_id: issue.asset_id,
        status:   { $nin: ['Resolved','Closed'] },
        _id:      { $ne: issue._id }
      });
      if (openIssues.length === 0) {
        await Asset.findByIdAndUpdate(issue.asset_id, { status: 'Operational' });
      }
      await Issue.findByIdAndUpdate(req.params.id, { closed_at: new Date().toISOString() });
    }

    res.json(issue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
