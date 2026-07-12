// ============================================================
//  MaintainIQ API Service
//  Connects to the Express/MongoDB backend (port 5000)
// ============================================================

const BASE = (window.location.port === '5000' || window.location.port === '3000')
  ? '' : 'http://localhost:5000'

function authHeader() {
  try {
    const saved = JSON.parse(localStorage.getItem('maintainiq_auth') || 'null')
    return saved?.token ? { Authorization: `Bearer ${saved.token}` } : {}
  } catch {
    return {}
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...options.headers },
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('maintainiq_auth')
    localStorage.removeItem('maintainiq_active_role')
    window.location.replace('../auth.html')
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res
}

async function requestJSON(path, options = {}) {
  const res = await request(path, options)
  return res.json()
}

// ─── Assets ──────────────────────────────────────────────────
export const AssetAPI = {
  list: (params = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    const q = new URLSearchParams(clean).toString()
    return request(`/api/assets${q ? '?' + q : ''}`)
      .then(async r => {
        const data = await r.json()
        const total = parseInt(r.headers.get('X-Total-Count') || data.length, 10)
        return { data, total }
      })
  },
  get:    (id)      => requestJSON(`/api/assets/${id}`),
  create: (body)    => requestJSON('/api/assets', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body)=> requestJSON(`/api/assets/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id)      => requestJSON(`/api/assets/${id}`, { method: 'DELETE' }),
  addMaintenance: (id, body) => requestJSON('/api/maintenance', { method: 'POST', body: JSON.stringify({ ...body, asset_id: id }) }),
}

// ─── Issues ──────────────────────────────────────────────────
export const IssueAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null))).toString()
    return requestJSON(`/api/issues${q ? '?' + q : ''}`)
  },
  get:    (id)      => requestJSON(`/api/issues/${id}`),
  update: (id, body)=> requestJSON(`/api/issues/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  create: (assetId, body) => requestJSON('/api/issues', { method: 'POST', body: JSON.stringify({ ...body, asset_id: assetId }) }),
}

// ─── Users / Technicians ─────────────────────────────────────
export const UserAPI = {
  technicians: () => requestJSON('/api/technicians'),
  users:       () => requestJSON('/api/users'),
  create:      (body) => requestJSON('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  delete:      (id)   => requestJSON(`/api/users/${id}`, { method: 'DELETE' }),
}

// ─── Maintenance ─────────────────────────────────────────────
export const MaintenanceAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null))).toString()
    return requestJSON(`/api/maintenance${q ? '?' + q : ''}`)
  },
}

// ─── Dashboard / Logs ────────────────────────────────────────
export const StatsAPI = {
  stats: () => requestJSON('/api/stats'),
  logs:  (limit = 20) => requestJSON(`/api/logs?limit=${limit}`),
  history: (limit = 15) => requestJSON(`/api/logs?limit=${limit}`),
}

// ─── AI Triage ───────────────────────────────────────────────
export const AIAPI = {
  triage: (body) => requestJSON('/api/ai-triage', { method: 'POST', body: JSON.stringify(body) }),
}

// ─── Categories / Locations ──────────────────────────────────
export const MetaAPI = {
  categories: () => requestJSON('/api/categories'),
  locations:  () => requestJSON('/api/locations'),
}

// ─── Mock Data (used only when backend is genuinely unreachable) ─────────────
export const MOCK = {
  stats: {
    total_assets: 47,
    active_issues: 12,
    pending_maintenance: 8,
    operational_rate: 89.4,
    status_distribution: { Operational: 32, 'Issue Reported': 6, 'Under Inspection': 3, 'Under Maintenance': 4, 'Out of Service': 2 },
    priority_distribution: { Critical: 3, High: 4, Medium: 3, Low: 2 },
    category_distribution: { 'Computing Hardware': 14, 'Heavy Machinery': 11, 'Facility Infrastructure': 9, 'Transportation': 8, 'Medical Equipment': 5 },
  },
  assets: [
    { id: 1, asset_code: '#MQ-1001-A', name: 'Projector Classroom 01', category: 'AV Equipment', location: 'Room 101, Block A', status: 'Operational', condition: 'Good', serial: 'SN-PRJ-001', value: 45000, purchase_date: '2023-03-15', last_service_date: '2024-11-10', next_service_date: '2025-05-10', description: 'Epson EB-L735U Laser Projector', qr_code_url: '/public/asset/#MQ-1001-A', issues: [], maintenance_records: [], history: [] },
    { id: 2, asset_code: '#MQ-1002-B', name: 'HVAC Unit - Main Hall', category: 'Facility Infrastructure', location: 'Rooftop, Main Building', status: 'Issue Reported', condition: 'Fair', serial: 'SN-HVAC-102', value: 285000, purchase_date: '2021-06-01', last_service_date: '2024-09-20', next_service_date: '2025-03-20', description: 'Daikin VRV IV system, 20-ton capacity', qr_code_url: '/public/asset/#MQ-1002-B', issues: [], maintenance_records: [], history: [] },
    { id: 3, asset_code: '#MQ-1003-C', name: 'UPS Power Backup Unit', category: 'Facility Infrastructure', location: 'Server Room, B2', status: 'Under Maintenance', condition: 'Poor', serial: 'SN-UPS-301', value: 120000, purchase_date: '2020-01-10', last_service_date: '2024-07-05', next_service_date: '2025-01-05', description: 'APC Symmetra LX 16kVA UPS System', qr_code_url: '/public/asset/#MQ-1003-C', issues: [], maintenance_records: [], history: [] },
    { id: 4, asset_code: '#MQ-1004-D', name: 'Security Camera Array', category: 'Security Systems', location: 'Perimeter, All Zones', status: 'Operational', condition: 'Excellent', serial: 'SN-CAM-404', value: 78000, purchase_date: '2023-08-22', last_service_date: '2024-12-01', next_service_date: '2025-06-01', description: 'Hikvision DS-2CD2183G2-I 8MP array, 24 units', qr_code_url: '/public/asset/#MQ-1004-D', issues: [], maintenance_records: [], history: [] },
    { id: 5, asset_code: '#MQ-1005-E', name: 'Elevator Unit - Tower A', category: 'Facility Infrastructure', location: 'Tower A, All Floors', status: 'Out of Service', condition: 'Poor', serial: 'SN-ELV-501', value: 1200000, purchase_date: '2018-03-01', last_service_date: '2024-10-15', next_service_date: '2025-04-15', description: 'KONE MonoSpace 700 traction elevator', qr_code_url: '/public/asset/#MQ-1005-E', issues: [], maintenance_records: [], history: [] },
    { id: 6, asset_code: '#MQ-1006-F', name: 'Lab Desktop Computers (20 units)', category: 'Computing Hardware', location: 'Computer Lab, Room 201', status: 'Operational', condition: 'Good', serial: 'SN-LAB-601', value: 640000, purchase_date: '2022-09-01', last_service_date: '2024-11-20', next_service_date: '2025-05-20', description: 'Dell OptiPlex 7090 batch — 20 units', qr_code_url: '/public/asset/#MQ-1006-F', issues: [], maintenance_records: [], history: [] },
  ],
  issues: [
    { id: 1, issue_number: '#REQ-1001', asset_id: 2, title: 'AC Making Unusual Noise', description: 'The HVAC unit in the main hall is making a loud grinding noise and is not cooling effectively.', priority: 'High', category: 'Mechanical', reporter_name: 'Ahmed Raza', reporter_contact: '0300-1234567', status: 'Assigned', evidence_url: null, technician_id: 1, created_at: '2025-07-10T09:00:00Z', updated_at: '2025-07-10T10:30:00Z', closed_at: null, ai_used: 1, ai_suggested_title: 'HVAC Compressor Noise & Cooling Failure', ai_suggested_category: 'Mechanical', ai_suggested_priority: 'High', ai_possible_causes: '["Compressor bearing wear", "Refrigerant leak", "Fan blade obstruction"]', ai_diagnostic_checks: '["Check refrigerant levels", "Inspect fan blades", "Test compressor amperage"]', technician: { id: 1, username: 'tech_ali', role: 'Technician' } },
    { id: 2, issue_number: '#REQ-1002', asset_id: 3, title: 'UPS Beeping Continuously', description: 'The UPS system is beeping every 30 seconds and showing battery warning lights.', priority: 'Critical', category: 'Electrical', reporter_name: 'Sara Khan', reporter_contact: '0321-9876543', status: 'Maintenance In Progress', evidence_url: null, technician_id: 2, created_at: '2025-07-09T14:00:00Z', updated_at: '2025-07-10T08:00:00Z', closed_at: null, ai_used: 1, ai_suggested_title: 'UPS Battery Failure - Critical Alert', ai_suggested_category: 'Electrical', ai_suggested_priority: 'Critical', ai_possible_causes: '["Battery degradation", "Overload condition", "Internal fault"]', ai_diagnostic_checks: '["Check battery voltage", "Verify load percentage", "Run self-test mode"]', technician: { id: 2, username: 'tech_zara', role: 'Technician' } },
    { id: 3, issue_number: '#REQ-1003', asset_id: 5, title: 'Elevator Door Not Closing', description: 'The elevator door in Tower A keeps reopening and gives an error on the panel.', priority: 'Critical', category: 'Safety', reporter_name: 'Public Report', reporter_contact: null, status: 'Inspection Started', evidence_url: null, technician_id: null, created_at: '2025-07-11T07:00:00Z', updated_at: '2025-07-11T07:30:00Z', closed_at: null, ai_used: 0, ai_suggested_title: null, ai_suggested_category: null, ai_suggested_priority: null, ai_possible_causes: null, ai_diagnostic_checks: null, technician: null },
  ],
  technicians: [
    { id: 1, username: 'tech_ali', role: 'Technician' },
    { id: 2, username: 'tech_zara', role: 'Technician' },
    { id: 3, username: 'tech_usman', role: 'Technician' },
  ],
  maintenance: [
    { id: 1, asset_id: 2, issue_id: 1, notes: 'Replaced compressor bearings and recharged refrigerant.', parts_used: 'Compressor bearings x2, R-410A refrigerant 5kg', cost: 28500, start_date: '2025-07-05', end_date: '2025-07-07', technician_name: 'tech_ali', status: 'Completed' },
    { id: 2, asset_id: 3, issue_id: 2, notes: 'Battery bank replacement in progress. Awaiting parts delivery.', parts_used: 'APC VRLA Battery 12V 18Ah x8', cost: 45000, start_date: '2025-07-10', end_date: '2025-07-12', technician_name: 'tech_zara', status: 'Scheduled' },
    { id: 3, asset_id: 1, issue_id: null, notes: 'Routine lamp and filter cleaning. Firmware updated to v3.2.1.', parts_used: 'Air filter x1', cost: 2500, start_date: '2024-11-09', end_date: '2024-11-10', technician_name: 'tech_usman', status: 'Completed' },
  ],
  logs: [
    { id: 1, asset_id: 2, timestamp: '2025-07-10T10:30:00Z', actor: 'Admin', action: 'Issue Assigned', details: 'Issue #REQ-1001 assigned to tech_ali.' },
    { id: 2, asset_id: 3, timestamp: '2025-07-09T14:05:00Z', actor: 'System', action: 'Issue Reported', details: 'Issue #REQ-1002 reported: UPS Beeping Continuously.' },
    { id: 3, asset_id: 5, timestamp: '2025-07-11T07:01:00Z', actor: 'Public', action: 'Issue Reported', details: 'Issue #REQ-1003 reported via public QR page.' },
    { id: 4, asset_id: 6, timestamp: '2025-07-08T09:00:00Z', actor: 'Admin', action: 'Registered', details: 'Asset #MQ-1006-F registered with 20 units.' },
  ],
}
