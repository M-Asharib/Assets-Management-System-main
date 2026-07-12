/**
 * seed.js  —  Seeds MongoDB with default MaintainIQ hackathon data if empty.
 * Called automatically at server startup.
 */
const Asset       = require('./models/Asset');
const Issue       = require('./models/Issue');
const Maintenance = require('./models/Maintenance');
const User        = require('./models/User');
const Log         = require('./models/Log');

async function seedIfEmpty() {
  const assetCount = await Asset.countDocuments();
  if (assetCount > 0) {
    console.log(`ℹ️  Database already has ${assetCount} assets — skipping seed.`);
    return;
  }

  console.log('🌱 Seeding MongoDB with default data...');

  // ── Users ────────────────────────────────────────────────
  // NOTE: insertMany() bypasses Mongoose's pre('save') password-hashing hook,
  // so each user must be created individually via .create() / .save() instead.
  const users = await Promise.all([
    User.create({ username: 'admin_jameson',    full_name: 'James Admin',     password: 'admin123',    role: 'Admin',       avatar_color: '#6366f1' }),
    User.create({ username: 'tech_ali',         full_name: 'Ali Technician',  password: 'tech123',     role: 'Technician',  avatar_color: '#06b6d4' }),
    User.create({ username: 'tech_zara',        full_name: 'Zara Engineer',   password: 'tech123',     role: 'Technician',  avatar_color: '#10b981' }),
    User.create({ username: 'supervisor_bilal', full_name: 'Bilal Supervisor',password: 'super123',    role: 'Supervisor',  avatar_color: '#f59e0b' }),
  ]);
  const [, techAli, techZara] = users;

  // ── Assets ───────────────────────────────────────────────
  const assets = await Asset.insertMany([
    { asset_code: '#AC-8842-X', name: 'Quantum Core Server S2',  category: 'Computing Hardware',     location: 'London DC3',      status: 'Operational',       condition: 'Excellent', serial: 'SN-90210-BC', value: 154200, purchase_date: '2024-10-12', last_service_date: '2026-05-10', next_service_date: '2026-11-10', description: 'Primary high-performance computing cluster supporting main operations.' },
    { asset_code: '#AC-1190-V', name: 'Excavator Series-7',       category: 'Heavy Machinery',        location: 'Site North-Alpha', status: 'Under Maintenance', condition: 'Fair',      serial: 'SN-44512-KL', value: 345000, purchase_date: '2023-09-28', last_service_date: '2026-06-15', next_service_date: '2026-12-15', description: 'Institutional mining and excavation mechanical unit.' },
    { asset_code: '#AC-7721-P', name: 'Power Grid Array B',       category: 'Facility Infrastructure',location: 'Texas Hub',       status: 'Issue Reported',    condition: 'Poor',      serial: 'SN-33881-ZZ', value: 42000,  purchase_date: '2024-10-05', last_service_date: '2025-07-06', next_service_date: '2026-01-06', description: 'Secondary power routing substation and breaker panel array.' },
    { asset_code: '#AC-9005-T', name: 'Tesla Logistics Unit 04',  category: 'Transportation',          location: 'Berlin R&D',      status: 'Operational',       condition: 'Good',      serial: 'SN-88229-MA', value: 89000,  purchase_date: '2024-10-14', last_service_date: '2026-04-18', next_service_date: '2026-10-18', description: 'Automated electric short-haul cargo transporter.' },
    { asset_code: '#AC-4432-F', name: 'Industrial CNC Mill',      category: 'Heavy Machinery',        location: 'Detroit Plant B',  status: 'Operational',       condition: 'Good',      serial: 'SN-55122-RR', value: 125400, purchase_date: '2024-10-01', last_service_date: '2026-03-20', next_service_date: '2026-09-20', description: 'Precision automated subtractive manufacturing spindle.' },
  ]);
  const [serverAsset, excavatorAsset, powerGridAsset, teslaAsset] = assets;

  // ── Issues ───────────────────────────────────────────────
  const issues = await Issue.insertMany([
    {
      issue_number: '#REQ-1001',
      asset_id:     powerGridAsset._id,
      title: 'AC Making Unusual Noise',
      description: 'The AC cooling vents are vibrating loudly and the main panel shows pressure warnings.',
      priority: 'High', category: 'Mechanical',
      reporter_name: 'Sarah Connor', reporter_contact: '0300-1234567',
      status: 'Reported', technician_id: null,
      ai_used: 1,
      ai_suggested_title: 'Substation Compressor Overpressure Warning',
      ai_suggested_category: 'Mechanical', ai_suggested_priority: 'High',
      ai_possible_causes: '["Compressor valve failure","Coolant line blockage","Vibration damper wear"]',
      ai_diagnostic_checks: '["Inspect coolant line pressure valves","Check stabilizer brackets","Log compressor temperature"]',
      ai_pattern_warning: 'Recurring issue pattern detected: similar failures twice in 90 days.'
    },
    {
      issue_number: '#REQ-1002',
      asset_id:     excavatorAsset._id,
      title: 'Hydraulic leak detected',
      description: 'Fluid is pooling under the main chassis during heavy hydraulic operations.',
      priority: 'Critical', category: 'Hydraulic',
      reporter_name: 'Alex Mercer', reporter_contact: 'alex.mercer@smit.edu',
      status: 'Inspection Started', technician_id: techAli._id,
      ai_used: 1,
      ai_suggested_title: 'Hydraulic Hose Overpressure Fracture',
      ai_suggested_category: 'Mechanical', ai_suggested_priority: 'Critical',
      ai_possible_causes: '["High pressure hose seal wear","Cylinder piston leak","Hydraulic fluid expansion"]',
      ai_diagnostic_checks: '["Depressurize lines immediately","Check piston seals for tear","Verify reservoir levels"]',
      ai_pattern_warning: 'SAFETY HAZARD: High risk of sudden hydraulic pressure loss. Ensure isolation procedures are active.'
    }
  ]);

  // ── Maintenance ──────────────────────────────────────────
  await Maintenance.insertMany([
    {
      asset_id: excavatorAsset._id, issue_id: issues[1]._id,
      notes: 'Seals replaced on hydraulic hose connections. Replaced worn piston gaskets.',
      parts_used: 'Hydraulic seal gasket set x2, high pressure connector x1',
      cost: 4200, start_date: '2026-06-12', end_date: '2026-06-15',
      technician_name: 'tech_ali', status: 'Completed'
    },
    {
      asset_id: teslaAsset._id, issue_id: null,
      notes: 'Routine alignment and battery health telemetry diagnostics.',
      parts_used: 'Lithium battery module B4',
      cost: 1800, start_date: '2026-04-17', end_date: '2026-04-18',
      technician_name: 'tech_zara', status: 'Completed'
    }
  ]);

  // ── Logs ─────────────────────────────────────────────────
  await Log.insertMany([
    { asset_id: powerGridAsset._id,  actor: 'Sarah Connor', action: 'Issue Reported',  details: 'Filed issue ticket #REQ-1001 via public asset page.' },
    { asset_id: excavatorAsset._id, actor: 'Admin',        action: 'Status Changed',  details: 'Asset advanced to Under Inspection. Issue #REQ-1002 assigned to tech_ali.' },
    { asset_id: serverAsset._id,    actor: 'Admin',        action: 'Registered',      details: 'New Asset CNC Mill #AC-4432-F registered successfully.' },
  ]);

  console.log('✅ Seed complete! Inserted: 5 assets, 2 issues, 2 maintenance records, 4 users, 3 logs.');
}

module.exports = { seedIfEmpty };
