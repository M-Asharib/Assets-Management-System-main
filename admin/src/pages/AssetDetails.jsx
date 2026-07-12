import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import {
  SectionCard, Icon, StatusBadge, Modal, FormField, showToast, InfoRow, Tabs
} from '../components/UI'
import { AssetAPI, UserAPI, MOCK } from '../api'

export default function AssetDetails({ asset, backendOffline, onBack, onAddMaintenance }) {
  const [qrSrc, setQrSrc] = useState('')
  const [activeTab, setActiveTab] = useState('info')
  const [technicians, setTechnicians] = useState([])
  const [showMaintModal, setShowMaintModal] = useState(false)
  const [maintLoading, setMaintLoading] = useState(false)
  const [maintForm, setMaintForm] = useState({
    notes: '', parts_used: '', cost: 0, start_date: '', end_date: '',
    technician_name: '', status: 'Completed'
  })
  const [maintErrors, setMaintErrors] = useState({})
  
  const qrRef = useRef()

  useEffect(() => {
    // Generate QR code encoding the safe public URL
    const publicUrl = `${window.location.origin}/public/asset/${asset.asset_code}`
    QRCode.toDataURL(publicUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f1629',
        light: '#ffffff'
      }
    })
      .then(url => setQrSrc(url))
      .catch(err => console.error(err))

    // Fetch technicians for maintenance booking
    if (backendOffline) {
      setTechnicians(MOCK.technicians)
      return
    }
    UserAPI.technicians()
      .then(res => setTechnicians(res))
      .catch(e => console.error(e))
  }, [asset, backendOffline])

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/public/asset/${asset.asset_code}`
    navigator.clipboard.writeText(publicUrl)
    showToast('Public asset link copied to clipboard!', 'success')
  }

  const downloadQR = () => {
    const link = document.createElement('a')
    link.download = `qr_${asset.asset_code}.png`
    link.href = qrSrc
    link.click()
    showToast('QR Code downloaded!', 'success')
  }

  const printLabel = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Print Label - ${asset.asset_code}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .label-card { border: 2px solid #000; display: inline-block; padding: 15px; border-radius: 8px; max-width: 320px; }
            .org { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #555; }
            .name { font-size: 18px; font-weight: bold; margin: 8px 0; }
            .code { font-family: monospace; font-size: 14px; font-weight: bold; color: #0058be; }
            .qr-img { width: 150px; height: 150px; margin: 10px 0; }
            .instruction { font-size: 10px; color: #777; margin-top: 5px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label-card">
            <div class="org">SMIT MAINTAINIQ PLATFORM</div>
            <div class="name">${asset.name}</div>
            <img class="qr-img" src="${qrSrc}" />
            <div class="code">${asset.asset_code}</div>
            <div class="instruction">Scan QR to inspect or report issue</div>
          </div>
        </body>
      </html>
    `)
    win.document.close()
  }

  const handleBookMaintenance = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!maintForm.notes.trim()) errors.notes = 'Service report notes are required'
    if (!maintForm.start_date) errors.start_date = 'Start date is required'
    if (!maintForm.end_date) errors.end_date = 'End date is required'
    if (!maintForm.technician_name) errors.technician_name = 'Technician is required'
    if (maintForm.cost < 0) errors.cost = 'Cost cannot be negative'
    
    if (Object.keys(errors).length > 0) {
      setMaintErrors(errors)
      return
    }

    setMaintLoading(true)
    if (backendOffline) {
      const record = {
        id: (asset.maintenance_records || []).length + 1,
        asset_id: asset.id,
        issue_id: null,
        notes: maintForm.notes,
        parts_used: maintForm.parts_used || null,
        cost: Number(maintForm.cost) || 0,
        start_date: maintForm.start_date,
        end_date: maintForm.end_date,
        technician_name: maintForm.technician_name,
        status: maintForm.status
      }
      asset.maintenance_records = asset.maintenance_records || []
      asset.maintenance_records.unshift(record)
      
      // Update dates on asset
      asset.last_service_date = maintForm.end_date
      const nextDate = new Date(maintForm.end_date)
      nextDate.setDate(nextDate.getDate() + 180)
      asset.next_service_date = nextDate.toISOString().split('T')[0]

      // Add to history
      asset.history = asset.history || []
      asset.history.unshift({
        id: Date.now(),
        timestamp: new Date().toISOString(),
        actor: 'Admin',
        action: 'Maintenance Logged',
        details: `Maintenance logged by ${maintForm.technician_name}. Cost: $${Number(maintForm.cost).toFixed(2)}. Notes: ${maintForm.notes}`
      })

      MOCK.logs.unshift({
        id: Date.now(),
        asset_id: asset.id,
        timestamp: new Date().toISOString(),
        actor: 'Admin',
        action: 'Maintenance Logged',
        details: `Maintenance record created for ${asset.asset_code}.`
      })

      showToast('Maintenance service logged successfully!', 'success')
      setShowMaintModal(false)
      setMaintLoading(false)
      setActiveTab('maintenance')
      return
    }

    AssetAPI.addMaintenance(asset.id, maintForm)
      .then(res => {
        showToast('Maintenance service logged successfully!', 'success')
        setShowMaintModal(false)
        setActiveTab('maintenance')
        // We trigger refresh externally
        onAddMaintenance?.()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setMaintLoading(false))
  }

  const openBookMaint = () => {
    setMaintForm({
      notes: '', parts_used: '', cost: 0, start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      technician_name: technicians[0]?.username || 'tech_ali', status: 'Completed'
    })
    setMaintErrors({})
    setShowMaintModal(true)
  }

  return (
    <div>
      {/* Back Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn-icon" onClick={onBack} style={{ padding: 6 }}>
          <Icon name="arrow_back" size={18} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className="page-title">{asset.name}</h1>
            <StatusBadge status={asset.status} />
          </div>
          <p className="page-subtitle">Asset Code: <span className="font-mono">{asset.asset_code}</span></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left Column: Specs, History, Issues */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Tabs
            items={[
              { id: 'info', label: 'Specifications & Info', icon: 'info' },
              { id: 'issues', label: 'Issues & Triage', icon: 'report_problem', count: (asset.issues || []).length },
              { id: 'maintenance', label: 'Maintenance Records', icon: 'build', count: (asset.maintenance_records || []).length },
              { id: 'history', label: 'Activity Timeline', icon: 'history', count: (asset.history || []).length }
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'info' && (
            <SectionCard title="Asset Metadata Spec Sheet" subtitle="Complete registry attributes">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <InfoRow label="Asset Code" value={asset.asset_code} mono />
                <InfoRow label="Serial Number" value={asset.serial || 'N/A'} mono />
                <InfoRow label="Category" value={asset.category} />
                <InfoRow label="Location" value={asset.location} />
                <InfoRow label="Condition" value={asset.condition} />
                <InfoRow label="Asset Value" value={`$${(asset.value || 0).toLocaleString()}`} />
                <InfoRow label="Purchase Date" value={asset.purchase_date} />
                <InfoRow label="Last Service Date" value={asset.last_service_date} />
                <InfoRow label="Next Service Date" value={asset.next_service_date} />
              </div>
              <div className="divider" />
              <div>
                <h5 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04rem', marginBottom: 6 }}>Description</h5>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{asset.description || 'No description provided for this asset.'}</p>
              </div>
            </SectionCard>
          )}

          {activeTab === 'issues' && (
            <SectionCard
              title="Issue History & Diagnostics"
              subtitle="All reported failures and AI Triage analyses"
            >
              {(asset.issues || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <Icon name="verified_user" size={36} style={{ color: 'var(--brand-success)', opacity: 0.6, marginBottom: 8 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No issue tickets filed against this asset!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {asset.issues.map(iss => (
                    <div key={iss.id} style={{
                      padding: 14, borderRadius: 12, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{iss.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            Reporter: <strong>{iss.reporter_name}</strong> · Priority: <strong style={{ color: iss.priority === 'Critical' ? '#ef4444' : '#f59e0b' }}>{iss.priority}</strong>
                          </div>
                        </div>
                        <StatusBadge status={iss.status} />
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '8px 0', lineHeight: 1.5 }}>
                        {iss.description}
                      </p>

                      {iss.ai_used === 1 && (
                        <div style={{
                          marginTop: 10, padding: 10, borderRadius: 8,
                          background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid var(--brand-primary)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span className="ai-badge">AI Suggested Triage</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {iss.ai_possible_causes && (
                              <div>Possible Causes: <strong>{JSON.parse(iss.ai_possible_causes).join(', ')}</strong></div>
                            )}
                            {iss.ai_diagnostic_checks && (
                              <div style={{ marginTop: 2 }}>Diagnostic Checks: <strong>{JSON.parse(iss.ai_diagnostic_checks).join(', ')}</strong></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'maintenance' && (
            <SectionCard
              title="Maintenance Logs"
              subtitle="Routine service inspections and repairs"
              action={
                <button className="btn btn-primary btn-sm" onClick={openBookMaint}>
                  <Icon name="add" size={16} /> Log Service Record
                </button>
              }
            >
              {(asset.maintenance_records || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <Icon name="build" size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No maintenance records found.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Technician</th>
                        <th>Notes / Actions</th>
                        <th>Cost</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asset.maintenance_records.map(rec => (
                        <tr key={rec.id}>
                          <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{rec.end_date}</span></td>
                          <td><span style={{ fontWeight: 600 }}>{rec.technician_name}</span></td>
                          <td>
                            <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{rec.notes}</div>
                            {rec.parts_used && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>Parts: {rec.parts_used}</div>
                            )}
                          </td>
                          <td><span className="font-mono">${(rec.cost || 0).toLocaleString()}</span></td>
                          <td><StatusBadge status={rec.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'history' && (
            <SectionCard title="Lifecycle Timeline Audit" subtitle="Immutable activity ledger">
              <div className="timeline">
                {(asset.history || []).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>No history records logged yet.</p>
                ) : (
                  asset.history.map(item => (
                    <div key={item.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: 'var(--bg-elevated)', color: 'var(--brand-primary-light)' }}>
                        <Icon name="history" size={16} />
                      </div>
                      <div className="timeline-content">
                        <p style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.action}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{item.details}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Logged by: <strong>{item.actor}</strong> · {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right Column: QR Code label, actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard title="Secure QR Identity" subtitle="Linked to public endpoint">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'white', padding: 12, borderRadius: 16,
                boxShadow: 'var(--shadow-glow)', display: 'inline-block'
              }}>
                {qrSrc ? (
                  <img src={qrSrc} alt="QR code" style={{ width: 180, height: 180, display: 'block' }} />
                ) : (
                  <div style={{ width: 180, height: 180, background: 'var(--bg-elevated)', borderRadius: 12 }} />
                )}
              </div>
              
              <div style={{ textAlign: 'center', marginTop: 4 }}>
                <span className="font-mono" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-primary-light)' }}>
                  {asset.asset_code}
                </span>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Any user can scan this QR code using a mobile phone camera to check live public health or report failures.
                </p>
              </div>

              <div className="divider" style={{ width: '100%', margin: '12px 0' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <button className="btn btn-primary" onClick={downloadQR} style={{ width: '100%' }}>
                  <Icon name="download" size={16} /> Download QR Code
                </button>
                <button className="btn btn-secondary" onClick={printLabel} style={{ width: '100%' }}>
                  <Icon name="print" size={16} /> Print Asset Label
                </button>
                <button className="btn btn-secondary" onClick={copyPublicLink} style={{ width: '100%' }}>
                  <Icon name="link" size={16} /> Copy Public Link
                </button>
                <a
                  href={`/public/asset/${asset.asset_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ width: '100%', textDecoration: 'none', justifyContent: 'center' }}
                >
                  <Icon name="open_in_new" size={16} /> Open Public Page
                </a>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Book Maintenance Modal */}
      <Modal open={showMaintModal} onClose={() => setShowMaintModal(false)} title="Log Maintenance service" size="modal-md"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowMaintModal(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleBookMaintenance} disabled={maintLoading}>
              {maintLoading ? 'Logging...' : 'Log Record'}
            </button>
          </>
        }
      >
        <form onSubmit={handleBookMaintenance}>
          <FormField label="Assigned Technician" required error={maintErrors.technician_name}>
            <select
              value={maintForm.technician_name}
              onChange={e => setMaintForm({ ...maintForm, technician_name: e.target.value })}
            >
              {technicians.map(t => <option key={t.id} value={t.username}>{t.username}</option>)}
            </select>
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Start Date" required error={maintErrors.start_date}>
              <input
                type="date"
                value={maintForm.start_date}
                onChange={e => setMaintForm({ ...maintForm, start_date: e.target.value })}
              />
            </FormField>
            <FormField label="Completion Date" required error={maintErrors.end_date}>
              <input
                type="date"
                value={maintForm.end_date}
                onChange={e => setMaintForm({ ...maintForm, end_date: e.target.value })}
              />
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Cost ($)" error={maintErrors.cost}>
              <input
                type="number"
                value={maintForm.cost}
                onChange={e => setMaintForm({ ...maintForm, cost: e.target.value })}
              />
            </FormField>
            <FormField label="Service Status">
              <select
                value={maintForm.status}
                onChange={e => setMaintForm({ ...maintForm, status: e.target.value })}
              >
                <option value="Completed">Completed</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </FormField>
          </div>

          <FormField label="Replacement Parts Used">
            <input
              placeholder="e.g. Hydraulic pressure valve x1, filters x2"
              value={maintForm.parts_used}
              onChange={e => setMaintForm({ ...maintForm, parts_used: e.target.value })}
            />
          </FormField>

          <FormField label="Service Report Notes" required error={maintErrors.notes}>
            <textarea
              rows={3}
              placeholder="Detail the diagnostics, maintenance steps, actions, testing results, or safety checks performed..."
              value={maintForm.notes}
              onChange={e => setMaintForm({ ...maintForm, notes: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
