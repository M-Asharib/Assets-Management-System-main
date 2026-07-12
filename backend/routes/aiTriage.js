/**
 * AI Triage Route  —  POST /api/ai-triage
 * Uses Gemini API if GEMINI_API_KEY is set, otherwise falls back to heuristics.
 */
const router = require('express').Router();
const https  = require('https');

// ─── Heuristic fallback ───────────────────────────────────────────────────────
function heuristic(complaint, asset) {
  const c = complaint.toLowerCase();
  const assetName = asset ? asset.name : 'Unknown Asset';

  if (/ac|chiller|cooling|leak|water|temp|hot|noise/i.test(c))
    return { title: 'Cooling efficiency drop / fluid leakage', category: 'HVAC / Temperature Regulation', priority: 'High',
      possible_causes: ['Blocked condensate drain','Dirty air filters','Refrigerant leak','Frozen evaporator coil'],
      diagnostic_checks: ['Verify power to condenser','Inspect condensate tray','Check air filter','Examine copper lines for frost'],
      pattern_warning: 'Recurring HVAC issue pattern detected on this site. Recommend full drainage flush.' };

  if (/power|fuse|breaker|spark|grid|wire|voltage|current|shock/i.test(c))
    return { title: 'Electrical power fault or short circuit', category: 'Electrical / Infrastructure', priority: 'Critical',
      possible_causes: ['Tripped breaker','Blown fuse','Loose terminal wiring','Transformer overload'],
      diagnostic_checks: ['Wear PPE before inspection','Verify breaker positions','Inspect terminals for blackening','Measure voltage with multimeter'],
      pattern_warning: 'SAFETY HAZARD: High voltage subsystem. Isolate circuit immediately.' };

  if (/excavator|engine|smoke|hydraulic|oil|cylinder|pump|valve/i.test(c))
    return { title: 'Engine overheat and hydraulic pressure drop', category: 'Mechanical / Hydraulics', priority: 'High',
      possible_causes: ['Low hydraulic fluid','Clogged air intake','Relief valve malfunction','Cylinder misfire'],
      diagnostic_checks: ['Check oil dipstick','Look for fluid pooling under chassis','Verify radiator fan','Connect pressure gauge'],
      pattern_warning: 'Operational warning: Heavy mechanical load limits exceeded. Check engine history.' };

  if (/server|computer|database|connection|offline|network|slow|disk|ram/i.test(c))
    return { title: 'IT hardware node network offline or disk congestion', category: 'IT / Computing Infrastructure', priority: 'Medium',
      possible_causes: ['Network switch failure','Storage volume full','Memory leak','Cooling fan malfunction'],
      diagnostic_checks: ['Ping local interface','Check server status LEDs','Verify patch cable link lights','Check thermal sensors via BMC'],
      pattern_warning: 'IT Cluster: High disk usage on adjacent servers. Potential replication backlog.' };

  return { title: 'Asset operational anomaly reported', category: 'General Hardware / Inspection', priority: 'Medium',
    possible_causes: ['Standard wear and tear','Sensor calibration mismatch','Environmental stress'],
    diagnostic_checks: ['Perform structural inspection','Run built-in diagnostics','Review panel error log'],
    pattern_warning: null };
}

// ─── Gemini API call ──────────────────────────────────────────────────────────
function callGemini(apiKey, complaint, asset) {
  return new Promise((resolve, reject) => {
    const ctx = asset
      ? `Asset: ${asset.name} | Category: ${asset.category} | Location: ${asset.location} | Status: ${asset.status}`
      : '';
    const prompt = `You are an AI maintenance engineer. Analyze this complaint against the asset context and return ONLY raw JSON (no markdown).\n\nAsset Context:\n${ctx}\n\nComplaint:\n"${complaint}"\n\nReturn JSON:\n{"title":"...","category":"...","priority":"Low|Medium|High|Critical","possible_causes":["..."],"diagnostic_checks":["..."],"pattern_warning":"...or null"}`;

    const body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const req  = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const j = JSON.parse(raw);
          if (j.error) { reject(new Error(j.error.message)); return; }
          let text = j.candidates[0].content.parts[0].text.trim();
          if (text.startsWith('```')) { text = text.split('\n').slice(1,-1).join('\n').trim(); }
          resolve(JSON.parse(text));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// POST /api/ai-triage
router.post('/', async (req, res) => {
  const { complaint, asset } = req.body;
  if (!complaint) return res.status(400).json({ error: 'complaint is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const result = await callGemini(apiKey, complaint, asset);
      return res.json(result);
    } catch (err) {
      console.error('Gemini API error, using heuristics:', err.message);
    }
  }
  res.json(heuristic(complaint, asset));
});

module.exports = router;
