import React, { useState } from 'react'
import { SectionCard, FormField, showToast, Icon } from '../components/UI'

export default function Settings({ backendOffline, toggleBackendMode }) {
  const [orgForm, setOrgForm] = useState({
    name: 'SMIT Institute of Tech',
    email: 'admin@smit.edu.pk',
    timezone: 'UTC +05:00 (Pakistan Standard Time)',
    maintenanceFreq: '180'
  })

  const handleSave = (e) => {
    e.preventDefault()
    showToast('Organization settings updated successfully!', 'success')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure organization information, asset settings, and backend connection modes</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Left Col: Org settings */}
        <SectionCard title="Organization Profile" subtitle="General profile details for report generation & labels">
          <form onSubmit={handleSave}>
            <FormField label="Organization Name">
              <input
                value={orgForm.name}
                onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
              />
            </FormField>

            <FormField label="Default Support Email">
              <input
                type="email"
                value={orgForm.email}
                onChange={e => setOrgForm({ ...orgForm, email: e.target.value })}
              />
            </FormField>

            <FormField label="System Timezone">
              <select
                value={orgForm.timezone}
                onChange={e => setOrgForm({ ...orgForm, timezone: e.target.value })}
              >
                <option value="UTC +05:00 (Pakistan Standard Time)">UTC +05:00 (Pakistan Standard Time)</option>
                <option value="UTC +00:00 (Greenwich Mean Time)">UTC +00:00 (Greenwich Mean Time)</option>
                <option value="UTC -05:00 (Eastern Standard Time)">UTC -05:00 (Eastern Standard Time)</option>
              </select>
            </FormField>

            <FormField label="Default Recurring Maintenance Cycle (Days)">
              <input
                type="number"
                value={orgForm.maintenanceFreq}
                onChange={e => setOrgForm({ ...orgForm, maintenanceFreq: e.target.value })}
              />
            </FormField>

            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </form>
        </SectionCard>

        {/* Right Col: Connection Modes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard title="Backend Connection Gateway" subtitle="Toggle live database vs local mock storage">
            <div style={{
              padding: 14, borderRadius: 12, border: '1px solid var(--border-subtle)',
              background: backendOffline ? 'rgba(245,158,11,0.04)' : 'rgba(16,185,129,0.04)',
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16
            }}>
              <Icon
                name={backendOffline ? 'cloud_off' : 'cloud_done'}
                size={32}
                style={{ color: backendOffline ? '#f59e0b' : '#10b981' }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  {backendOffline ? 'Offline Demo Mode' : 'Connected to Live API'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {backendOffline
                    ? 'Using high-fidelity mockup database inside browser. All edits persist during window session.'
                    : 'All transactions synchronized directly with FastAPI and PostgreSQL/SQLite database.'
                  }
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Offline Demo / Sandbox Mode
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={backendOffline}
                  onChange={toggleBackendMode}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.4 }}>
              Tip: If you run `npm run dev` or launch FastAPI, disable Demo Mode to sync changes directly into backend tables.
            </p>
          </SectionCard>

          <SectionCard title="System Diagnostics" subtitle="Server information audit logs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Application Version</span>
                <strong className="font-mono">v1.4.0 (Enterprise)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>FastAPI Microservice</span>
                <span style={{ color: backendOffline ? 'var(--text-muted)' : '#10b981', fontWeight: 600 }}>
                  {backendOffline ? 'Unreachable' : 'Active (HTTP 200)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Database engine</span>
                <strong className="font-mono">{backendOffline ? 'LocalStorage Cache' : 'SQLite DB (database.db)'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Frontend Platform</span>
                <strong className="font-mono">React 18.2 (Vite)</strong>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
