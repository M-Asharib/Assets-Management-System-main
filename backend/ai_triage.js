const https = require('https');

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  
  // Try loading dotenv manually if process.env isn't populated
  try {
    require('dotenv').config();
    if (process.env.GEMINI_API_KEY) {
      return process.env.GEMINI_API_KEY;
    }
  } catch (e) {}

  return null;
}

function analyzeComplaintHeuristics(complaint, asset) {
  const cLower = complaint.toLowerCase();
  const assetName = asset ? asset.name : "Unknown Asset";
  const assetCat = asset ? asset.category : "General";

  // HVAC/Cooling/Leaking
  if (/ac|chiller|cooling|leak|water|temp|hot|noise/i.test(cLower)) {
    return {
      title: "Cooling efficiency drop and potential fluid leakage",
      category: "HVAC / Temperature Regulation",
      priority: "High",
      possible_causes: [
        "Blocked condensate drain pipe",
        "Dirty or clogged air filters restricting airflow",
        "Refrigerant leak or low refrigerant pressure",
        "Frozen evaporator coil"
      ],
      diagnostic_checks: [
        "Verify power supply to the condenser unit.",
        "Inspect condensate tray and drain pipe for standing water/clogs.",
        "Check the air filter status and clean/replace if obstructed.",
        "Examine copper lines for signs of frosting or oily residue."
      ],
      pattern_warning: "Maintenance notice: Similar HVAC units at this site reported filter wear within 90 days. Recommend complete drainage flush."
    };
  }

  // Power/Electrical/Fuse
  if (/power|fuse|breaker|spark|grid|wire|voltage|current|shock/i.test(cLower)) {
    return {
      title: "Electrical power fault or short circuit warning",
      category: "Electrical / Infrastructure",
      priority: "Critical",
      possible_causes: [
        "Tripped main or sub-panel circuit breaker",
        "Blown fuse due to overcurrent draw",
        "Loose terminal wiring or insulation breakdown",
        "Transformer coil overload"
      ],
      diagnostic_checks: [
        "Ensure appropriate electrical safety equipment (PPE) is worn before inspection.",
        "Verify breaker switch positions in the local electrical cabinet.",
        "Inspect terminals for blackening, melting, or thermal damage.",
        "Measure terminal voltage using a certified digital multimeter."
      ],
      pattern_warning: "SAFETY HAZARD: High voltage subsystem. Multiple grid alerts have been registered recently. Isolate circuit immediately."
    };
  }

  // Heavy Machinery/Mechanical
  if (/excavator|engine|smoke|hydraulic|oil|cylinder|pump|valve/i.test(cLower)) {
    return {
      title: "Engine overheat and hydraulic pressure drop",
      category: "Mechanical / Hydraulics",
      priority: "High",
      possible_causes: [
        "Low hydraulic fluid or severe seal degradation",
        "Clogged engine air intake or radiator core blockage",
        "Hydraulic pressure relief valve malfunction",
        "Engine cylinder combustion misfire"
      ],
      diagnostic_checks: [
        "Check engine and hydraulic oil dipsticks for appropriate fill levels.",
        "Visually check under the chassis for fresh fluid pooling.",
        "Verify engine radiator fan switches on when operational temperature is reached.",
        "Connect hydraulic pressure gauge to test relief valve output."
      ],
      pattern_warning: "Operational warning: Heavy mechanical load limits exceeded. Recommend checking engine history logs."
    };
  }

  // IT/Computing
  if (/server|computer|database|connection|offline|network|slow|disk|ram/i.test(cLower)) {
    return {
      title: "IT hardware node network offline or disk congestion",
      category: "IT / Computing Infrastructure",
      priority: "Medium",
      possible_causes: [
        "Network switch interface failure or ethernet disconnect",
        "Storage disk volume exhaustion (100% capacity)",
        "Memory leak in system host services",
        "Cooling fan malfunction leading to thermal throttling"
      ],
      diagnostic_checks: [
        "Attempt local ping check to verify basic network interface controller (NIC) response.",
        "Check server status LED panel for hardware failure indicators.",
        "Verify patch cable link lights at the server rack interface.",
        "Assess thermal sensors output via baseboard management controller (BMC)."
      ],
      pattern_warning: "IT Cluster alert: High disk usage observed on adjacent servers. Potential replication buffer backlog."
    };
  }

  // Fallback
  return {
    title: "Asset operational anomaly reported",
    category: "General Hardware / Inspection",
    priority: "Medium",
    possible_causes: [
      "Standard wear-and-tear of mechanical/electrical components",
      "Sensor calibration mismatch",
      "Environmental factor stress (dust, high ambient temperature)"
    ],
    diagnostic_checks: [
      "Perform external structural inspection.",
      "Run built-in system diagnostics routine (if supported).",
      "Review local panel error code log."
    ],
    pattern_warning: null
  };
}

function callGeminiApi(apiKey, complaint, asset) {
  return new Promise((resolve, reject) => {
    const assetDetails = asset ? `
Asset Name: ${asset.name}
Category: ${asset.category}
Location: ${asset.location}
Current Status: ${asset.status}
Condition: ${asset.condition}
Last Service Date: ${asset.last_service_date || 'Never'}
` : '';

    const prompt = `You are an AI maintenance engineer in a smart facility. Analyze this user complaint against the given asset details and return a structured JSON diagnostic report.

=== ASSET CONTEXT ===
${assetDetails}
=== USER COMPLAINT ===
"${complaint}"

Return ONLY a valid JSON object matching this schema. Do not write markdown tags (like \`\`\`json), write ONLY the raw JSON string.
{
  "title": "Professional summary title of the issue",
  "category": "Shorthand category representing the issue type",
  "priority": "Low, Medium, High, or Critical based on urgency and safety",
  "possible_causes": ["cause 1", "cause 2", "cause 3"],
  "diagnostic_checks": ["diagnostic step 1", "diagnostic step 2"],
  "pattern_warning": "Warning string if the asset type is prone to failure, or null"
}`;

    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const resJson = JSON.parse(body);
          if (resJson.error) {
            reject(new Error(resJson.error.message));
            return;
          }
          
          let textOutput = resJson.candidates[0].content.parts[0].text.trim();
          
          // Strip code fences if the model included them anyway
          if (textOutput.startsWith("```")) {
            const lines = textOutput.split("\n");
            if (lines[0].startsWith("```")) lines.shift();
            if (lines[lines.length - 1].trim() === "```") lines.pop();
            textOutput = lines.join("\n").trim();
          }
          
          const parsedResult = JSON.parse(textOutput);
          resolve({
            title: parsedResult.title || "Asset malfunction summary",
            category: parsedResult.category || "General Maintenance",
            priority: parsedResult.priority || "Medium",
            possible_causes: parsedResult.possible_causes || ["Component failure"],
            diagnostic_checks: parsedResult.diagnostic_checks || ["Inspect unit"],
            pattern_warning: parsedResult.pattern_warning || null
          });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(requestData);
    req.end();
  });
}

async function runAiTriage(complaint, asset) {
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const apiResult = await callGeminiApi(apiKey, complaint, asset);
      if (apiResult) return apiResult;
    } catch (e) {
      console.error("Gemini API error, falling back to heuristics:", e.message);
    }
  }
  
  return analyzeComplaintHeuristics(complaint, asset);
}

module.exports = {
  runAiTriage
};
