import os
import json
import urllib.request
from typing import Optional, List
from .models import Asset
from .schemas import AITriageResponse

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

def get_gemini_api_key() -> Optional[str]:
    # Check environment variable first
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
        
    # Check for a .env file locally as a fallback
    if os.path.exists(".env"):
        try:
            with open(".env", "r") as f:
                for line in f:
                    if line.startswith("GEMINI_API_KEY="):
                        return line.split("=", 1)[1].strip()
        except:
            pass
    return None

def analyze_complaint_heuristics(complaint: str, asset: Optional[Asset]) -> AITriageResponse:
    c_lower = complaint.lower()
    asset_name = asset.name if asset else "Unknown Asset"
    asset_cat = asset.category if asset else "General"
    
    # 1. AC / Cooling / Leaking
    if any(k in c_lower for k in ["ac", "chiller", "cooling", "leak", "water", "temp", "hot", "noise"]):
        return AITriageResponse(
            title="Cooling efficiency drop and potential fluid leakage",
            category="HVAC / Temperature Regulation",
            priority="High",
            possible_causes=[
                "Blocked condensate drain pipe",
                "Dirty or clogged air filters restricting airflow",
                "Refrigerant leak or low refrigerant pressure",
                "Frozen evaporator coil"
            ],
            diagnostic_checks=[
                "Verify power supply to the condenser unit.",
                "Inspect condensate tray and drain pipe for standing water/clogs.",
                "Check the air filter status and clean/replace if obstructed.",
                "Examine copper lines for signs of frosting or oily residue."
            ],
            pattern_warning="Maintenance notice: Similar HVAC units at this site reported filter wear within 90 days. Recommend complete drainage flush."
        )
        
    # 2. Power / Electrical / Fuse / Breaker / Grid
    elif any(k in c_lower for k in ["power", "fuse", "breaker", "spark", "grid", "wire", "voltage", "current", "shock"]):
        return AITriageResponse(
            title="Electrical power fault or short circuit warning",
            category="Electrical / Infrastructure",
            priority="Critical",
            possible_causes=[
                "Tripped main or sub-panel circuit breaker",
                "Blown fuse due to overcurrent draw",
                "Loose terminal wiring or insulation breakdown",
                "Transformer coil overload"
            ],
            diagnostic_checks=[
                "Ensure appropriate electrical safety equipment (PPE) is worn before inspection.",
                "Verify breaker switch positions in the local electrical cabinet.",
                "Inspect terminals for blackening, melting, or thermal damage.",
                "Measure terminal voltage using a certified digital multimeter."
            ],
            pattern_warning="SAFETY HAZARD: High voltage subsystem. Multiple grid alerts have been registered recently. Isolate circuit immediately."
        )
        
    # 3. Excavator / Engine / Smoke / Hydraulic / Oil
    elif any(k in c_lower for k in ["excavator", "engine", "smoke", "hydraulic", "oil", "leak", "cylinder", "pump", "valve"]):
        return AITriageResponse(
            title="Engine overheat and hydraulic pressure drop",
            category="Mechanical / Hydraulics",
            priority="High",
            possible_causes=[
                "Low hydraulic fluid or severe seal degradation",
                "Clogged engine air intake or radiator core blockage",
                "Hydraulic pressure relief valve malfunction",
                "Engine cylinder combustion misfire"
            ],
            diagnostic_checks=[
                "Check engine and hydraulic oil dipsticks for appropriate fill levels.",
                "Visually check under the chassis for fresh fluid pooling.",
                "Verify engine radiator fan switches on when operational temperature is reached.",
                "Connect hydraulic pressure gauge to test relief valve output."
            ],
            pattern_warning="Operational warning: Heavy mechanical load limits exceeded. Recommend checking engine history logs."
        )
        
    # 4. Computing / Server / Software / Database / Connection
    elif any(k in c_lower for k in ["server", "computer", "database", "connection", "offline", "network", "slow", "disk", "ram"]):
        return AITriageResponse(
            title="IT hardware node network offline or disk congestion",
            category="IT / Computing Infrastructure",
            priority="Medium",
            possible_causes=[
                "Network switch interface failure or ethernet disconnect",
                "Storage disk volume exhaustion (100% capacity)",
                "Memory leak in system host services",
                "Cooling fan malfunction leading to thermal throttling"
            ],
            diagnostic_checks=[
                "Attempt local ping check to verify basic network interface controller (NIC) response.",
                "Check server status LED panel for hardware failure indicators.",
                "Verify patch cable link lights at the server rack interface.",
                "Assess thermal sensors output via baseboard management controller (BMC)."
            ],
            pattern_warning="IT Cluster alert: High disk usage observed on adjacent servers. Potential replication buffer backlog."
        )
        
    # Default fallback
    return AITriageResponse(
        title="Asset operational anomaly reported",
        category="General Hardware / Inspection",
        priority="Medium",
        possible_causes=[
            "Standard wear-and-tear of mechanical/electrical components",
            "Sensor calibration mismatch",
            "Environmental factor stress (dust, high ambient temperature)"
        ],
        diagnostic_checks=[
            "Perform external structural inspection.",
            "Run built-in system diagnostics routine (if supported).",
            "Review local panel error code log."
        ],
        pattern_warning=None
    )

def call_gemini_api(api_key: str, complaint: str, asset: Optional[Asset]) -> Optional[AITriageResponse]:
    asset_details = ""
    if asset:
        asset_details = (
            f"Asset Name: {asset.name}\n"
            f"Category: {asset.category}\n"
            f"Location: {asset.location}\n"
            f"Current Status: {asset.status}\n"
            f"Condition: {asset.condition}\n"
            f"Last Service Date: {asset.last_service_date or 'Never'}\n"
        )
        
    prompt = (
        "You are an AI maintenance engineer in a smart facility. "
        "Analyze this user complaint against the given asset details and return a structured JSON diagnostic report.\n\n"
        "=== ASSET CONTEXT ===\n"
        f"{asset_details}\n"
        "=== USER COMPLAINT ===\n"
        f"\"{complaint}\"\n\n"
        "Return ONLY a valid JSON object matching this schema. Do not write markdown tags (like ```json), write ONLY the raw JSON string.\n"
        "{\n"
        '  "title": "Professional summary title of the issue",\n'
        '  "category": "Shorthand category representing the issue type",\n'
        '  "priority": "Low, Medium, High, or Critical based on urgency and safety",\n'
        '  "possible_causes": ["cause 1", "cause 2", "cause 3"],\n'
        '  "diagnostic_checks": ["diagnostic step 1", "diagnostic step 2"],\n'
        '  "pattern_warning": "Warning string if the asset type is prone to failure, or null"\n'
        "}"
    )

    request_data = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt
                    }
                ]
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    url = f"{GEMINI_API_URL}?key={api_key}"
    data_bytes = json.dumps(request_data).encode("utf-8")
    
    try:
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            
            # Extract output text
            text_output = res_json['candidates'][0]['content']['parts'][0]['text']
            
            # Clean possible markdown fence code formatting
            text_output = text_output.strip()
            if text_output.startswith("```"):
                lines = text_output.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].strip() == "```":
                    lines = lines[:-1]
                text_output = "\n".join(lines).strip()
                
            parsed_result = json.loads(text_output)
            
            return AITriageResponse(
                title=parsed_result.get("title", "Asset malfunction summary"),
                category=parsed_result.get("category", "General Maintenance"),
                priority=parsed_result.get("priority", "Medium"),
                possible_causes=parsed_result.get("possible_causes", ["Component failure"]),
                diagnostic_checks=parsed_result.get("diagnostic_checks", ["Inspect unit"]),
                pattern_warning=parsed_result.get("pattern_warning", None)
            )
    except Exception as e:
        print(f"Gemini API invocation failed: {e}. Falling back to heuristics.")
        return None

def run_ai_triage(complaint: str, asset: Optional[Asset]) -> AITriageResponse:
    api_key = get_gemini_api_key()
    if api_key:
        api_result = call_gemini_api(api_key, complaint, asset)
        if api_result:
            return api_result
            
    # Fallback to local heuristic model if API key is not present or failed
    return analyze_complaint_heuristics(complaint, asset)
