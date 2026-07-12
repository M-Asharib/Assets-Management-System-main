import React, { useState, useEffect } from 'react'
import {
  SectionCard, FilterBar, Pagination, Icon, StatusBadge, PriorityBadge,
  Modal, FormField, showToast, InfoRow, ConfirmDialog, DropMenu
} from '../components/UI'
import { IssueAPI, UserAPI, AssetAPI, MOCK } from '../api'

export default function Issues({ backendOffline, onAssetInspect }) {
  const [issues, setIssues] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [technicians, setTechnicians] = useState([])
  const [selectedTech, setSelectedTech] = useState('All Technicians')

  // Loading
  const [loading, setLoading] = useState(false)

  // Details modal
  const [showDetails, setShowDetails] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(null)
  
  // Triage editing form
  const [triageForm, setTriageForm] = useState({
    title: '', category: '', priority: '', status: '',
    description: '', technician_id: ''
  })
  const [isEditingTriage, setIsEditingTriage] = useState(false)

  // Fetch technicians
  useEffect(() => {
    if (backendOffline) {
      setTechnicians(MOCK.technicians)
      return
    }
    UserAPI.technicians()
      .then(res => setTechnicians(res))
      .catch(e => console.error(e))
  }, [backendOffline])

  // Fetch issues
  const fetchIssues = () => {
    setLoading(true)
    if (backendOffline) {
      let filtered = [...MOCK.issues]
      if (search) {
        filtered = filtered.filter(i =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.issue_number.toLowerCase().includes(search.toLowerCase()) ||
          i.description.toLowerCase().includes(search.toLowerCase())
        )
      }
      if (status !== 'All Statuses') {
        filtered = filtered.filter(i => i.status === status)
      }
      if (selectedTech !== 'All Technicians') {
        filtered = filtered.filter(i => i.technician?.username === selectedTech)
      }
      setTotal(filtered.length)
      setIssues(filtered.slice((page - 1) * 8, page * 8))
      setLoading(false)
      return
    }

    const techObj = technicians.find(t => t.username === selectedTech)
    const params = {
      skip: (page - 1) * 8,
      limit: 8,
      status: status === 'All Statuses' ? undefined : status,
      technician_id: selectedTech === 'All Technicians' ? undefined : (techObj ? techObj.id : undefined)
    }

    IssueAPI.list(params)
      .then(res => {
        // filter client-side search query
        let data = res
        if (search) {
          data = res.filter(i =>
            i.title.toLowerCase().includes(search.toLowerCase()) ||
            i.issue_number.toLowerCase().includes(search.toLowerCase()) ||
            i.description.toLowerCase().includes(search.toLowerCase())
          )
        }
        setIssues(data.slice(0, 8))
        setTotal(data.length)
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchIssues()
  }, [page, search, status, selectedTech, backendOffline, technicians])

  const openDetails = (issue) => {
    setSelectedIssue(issue)
    setTriageForm({
      title: issue.title,
      category: issue.category,
      priority: issue.priority,
      status: issue.status,
      description: issue.description,
      technician_id: issue.technician_id || ''
    })
    setIsEditingTriage(false)
    setShowDetails(true)
  }

  const handleUpdateIssue = async (e) => {
    e.preventDefault()
    setLoading(true)

    const payload = {
      title: triageForm.title,
      category: triageForm.category,
      priority: triageForm.priority,
      status: triageForm.status,
      description: triageForm.description,
      technician_id: triageForm.technician_id ? Number(triageForm.technician_id) : null
    }

    if (backendOffline) {
      const idx = MOCK.issues.findIndex(i => i.id === selectedIssue.id)
      if (idx > -1) {
        const prev = MOCK.issues[idx]
        const tech = technicians.find(t => t.id === payload.technician_id) || null
        
        let newStatus = payload.status
        // Auto advance to Assigned if reported and has tech
        if (newStatus === 'Reported' && payload.technician_id) {
          newStatus = 'Assigned'
        }

        const updated = {
          ...prev,
          title: payload.title,
          category: payload.category,
          priority: payload.priority,
          status: newStatus,
          description: payload.description,
          technician_id: payload.technician_id,
          technician: tech,
          updated_at: new Date().toISOString()
        }

        if (newStatus === 'Resolved') {
          updated.closed_at = new Date().toISOString()
        }

        MOCK.issues[idx] = updated

        // Advanced status workflows triggers: update linked asset status
        const assetIdx = MOCK.assets.findIndex(a => a.id === updated.asset_id)
        if (assetIdx > -1) {
          const ast = MOCK.assets[assetIdx]
          
          if (newStatus === 'Inspection Started') {
            ast.status = 'Under Inspection'
          } else if (newStatus === 'Maintenance In Progress') {
            ast.status = 'Under Maintenance'
          } else if (newStatus === 'Resolved') {
            ast.status = 'Operational'
          } else if (newStatus === 'Reopened') {
            ast.status = 'Issue Reported'
          }
          
          ast.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            actor: 'Admin',
            action: 'Issue Status Changed',
            details: `Issue ${updated.issue_number} status updated to ${newStatus}. Linked asset status is now ${ast.status}.`
          })
        }

        // Add history log
        MOCK.logs.unshift({
          id: Date.now(),
          asset_id: updated.asset_id,
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          action: 'Issue Action',
          details: `Issue ${updated.issue_number} updated to status: ${newStatus}.`
        })

        setSelectedIssue(updated)
      }
      showToast('Issue ticket updated successfully!', 'success')
      setIsEditingTriage(false)
      fetchIssues()
      setLoading(false)
      return
    }

    IssueAPI.update(selectedIssue.id, payload)
      .then(res => {
        showToast('Issue ticket updated successfully!', 'success')
        setSelectedIssue(res)
        setIsEditingTriage(false)
        fetchIssues()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const navigateToAsset = (assetId) => {
    setShowDetails(false)
    let found = null
    if (backendOffline) {
      found = MOCK.assets.find(a => a.id === assetId)
    } else {
      // Find asset code
      found = MOCK.assets.find(a => a.id === assetId)
    }
    if (found) {
      onAssetInspect?.(found)
    }
  }

  const progressStatus = async (nextStatus) => {
    setTriageForm(prev => ({ ...prev, status: nextStatus }))
    
    // Auto-save the advanced status
    if (backendOffline) {
      const idx = MOCK.issues.findIndex(i => i.id === selectedIssue.id)
      if (idx > -1) {
        const prev = MOCK.issues[idx]
        const updated = {
          ...prev,
          status: nextStatus,
          updated_at: new Date().toISOString()
        }

        if (nextStatus === 'Resolved') {
          updated.closed_at = new Date().toISOString()
        }

        MOCK.issues[idx] = updated

        // Link asset transitions
        const assetIdx = MOCK.assets.findIndex(a => a.id === updated.asset_id)
        if (assetIdx > -1) {
          const ast = MOCK.assets[assetIdx]
          if (nextStatus === 'Inspection Started') ast.status = 'Under Inspection'
          else if (nextStatus === 'Maintenance In Progress') ast.status = 'Under Maintenance'
          else if (nextStatus === 'Resolved') ast.status = 'Operational'
          else if (nextStatus === 'Reopened') ast.status = 'Issue Reported'

          ast.history.unshift({
            id: Date.now(),
            timestamp: new Date().toISOString(),
            actor: 'Admin',
            action: 'Status Advance',
            details: `Advanced issue ${updated.issue_number} to ${nextStatus}. Asset set to ${ast.status}.`
          })
        }
        setSelectedIssue(updated)
        showToast(`Advanced status to ${nextStatus}`, 'success')
        fetchIssues()
      }
      return
    }

    IssueAPI.update(selectedIssue.id, { status: nextStatus })
      .then(res => {
        showToast(`Advanced status to ${nextStatus}`, 'success')
        setSelectedIssue(res)
        fetchIssues()
      })
      .catch(e => showToast(e.message, 'error'))
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Issue Tickets</h1>
          <p className="page-subtitle">Track, triage, assign, and resolve reported equipment issues</p>
        </div>
      </div>

      {/* Filter and Table */}
      <SectionCard noPad>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              {
                value: status,
                onChange: setStatus,
                options: [
                  { label: 'All Statuses', value: 'All Statuses' },
                  { label: 'Reported', value: 'Reported' },
                  { label: 'Assigned', value: 'Assigned' },
                  { label: 'Inspection Started', value: 'Inspection Started' },
                  { label: 'Maintenance In Progress', value: 'Maintenance In Progress' },
                  { label: 'Waiting For Parts', value: 'Waiting For Parts' },
                  { label: 'Resolved', value: 'Resolved' },
                  { label: 'Closed', value: 'Closed' }
                ]
              },
              {
                value: selectedTech,
                onChange: setSelectedTech,
                options: [
                  { label: 'All Technicians', value: 'All Technicians' },
                  ...technicians.map(t => ({ label: t.username, value: t.username }))
                ]
              }
            ]}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Issue Details</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Assigned Tech</th>
                <th>Date Filed</th>
                <th>Status</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && issues.length === 0 ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} style={{ padding: 12 }}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <EmptyState title="No active issue tickets found" icon="report_problem" />
                  </td>
                </tr>
              ) : (
                issues.map(iss => (
                  <tr key={iss.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                        {iss.issue_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{iss.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        Reporter: <strong>{iss.reporter_name}</strong>
                      </div>
                    </td>
                    <td><PriorityBadge priority={iss.priority} /></td>
                    <td>
                      <span className="chip">{iss.category}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, fontSize: '0.84rem' }}>
                        {iss.technician?.username ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="person" size={14} style={{ color: 'var(--brand-primary-light)' }} />
                            {iss.technician.username}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {new Date(iss.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td><StatusBadge status={iss.status} /></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDetails(iss)}>
                        Inspect Ticket
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} pageSize={8} onPage={setPage} />
      </SectionCard>

      {/* Ticket Details & Action Workflow Modal */}
      {selectedIssue && (
        <Modal open={showDetails} onClose={() => setShowDetails(false)} title={`Issue Ticket ${selectedIssue.issue_number}`} size="modal-lg"
          footer={
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDetails(false)}>Close</button>
              {isEditingTriage ? (
                <button className="btn btn-primary btn-sm" onClick={handleUpdateIssue}>
                  Save Changes
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingTriage(true)}>
                  <Icon name="edit" size={14} /> Review & Edit Details
                </button>
              )}
            </>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
            {/* Left Col: Issue Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isEditingTriage ? (
                <form onSubmit={handleUpdateIssue}>
                  <FormField label="Issue Title" required>
                    <input
                      value={triageForm.title}
                      onChange={e => setTriageForm({ ...triageForm, title: e.target.value })}
                    />
                  </FormField>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <FormField label="Category">
                      <input
                        value={triageForm.category}
                        onChange={e => setTriageForm({ ...triageForm, category: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Priority">
                      <select
                        value={triageForm.priority}
                        onChange={e => setTriageForm({ ...triageForm, priority: e.target.value })}
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Assign Technician">
                    <select
                      value={triageForm.technician_id}
                      onChange={e => setTriageForm({ ...triageForm, technician_id: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.username}</option>)}
                    </select>
                  </FormField>

                  <FormField label="Ticket Status">
                    <select
                      value={triageForm.status}
                      onChange={e => setTriageForm({ ...triageForm, status: e.target.value })}
                    >
                      <option value="Reported">Reported</option>
                      <option value="Assigned">Assigned</option>
                      <option value="Inspection Started">Inspection Started</option>
                      <option value="Maintenance In Progress">Maintenance In Progress</option>
                      <option value="Waiting For Parts">Waiting For Parts</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </FormField>

                  <FormField label="Detailed Description">
                    <textarea
                      rows={4}
                      value={triageForm.description}
                      onChange={e => setTriageForm({ ...triageForm, description: e.target.value })}
                    />
                  </FormField>
                </form>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedIssue.title}</h3>
                  <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
                    <StatusBadge status={selectedIssue.status} />
                    <PriorityBadge priority={selectedIssue.priority} />
                    <span className="chip">{selectedIssue.category}</span>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-elevated)', padding: 14, borderRadius: 10, margin: '14px 0' }}>
                    {selectedIssue.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <InfoRow label="Ticket Number" value={selectedIssue.issue_number} mono />
                    <InfoRow label="Reporter Name" value={selectedIssue.reporter_name} />
                    <InfoRow label="Reporter Contact" value={selectedIssue.reporter_contact || 'N/A'} />
                    <InfoRow label="Assigned Technician" value={selectedIssue.technician?.username || 'Unassigned'} />
                    <InfoRow label="Created Date" value={new Date(selectedIssue.created_at).toLocaleString()} />
                    <InfoRow label="Last Updated" value={new Date(selectedIssue.updated_at).toLocaleString()} />
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: AI Triage & Status Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status workflow triggers */}
              <SectionCard title="Workflow State Transition" subtitle="Advance the ticket status">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedIssue.status === 'Reported' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ticket reported. Assign technician below to advance status.</p>
                      <button className="btn btn-primary" onClick={() => setIsEditingTriage(true)}>
                        <Icon name="person_add" size={16} /> Assign Technician
                      </button>
                    </div>
                  )}

                  {selectedIssue.status === 'Assigned' && (
                    <button className="btn btn-primary" onClick={() => progressStatus('Inspection Started')}>
                      <Icon name="play_arrow" size={16} /> Begin Site Inspection
                    </button>
                  )}

                  {selectedIssue.status === 'Inspection Started' && (
                    <button className="btn btn-primary" onClick={() => progressStatus('Maintenance In Progress')}>
                      <Icon name="build" size={16} /> Start Repair/Maintenance
                    </button>
                  )}

                  {selectedIssue.status === 'Maintenance In Progress' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => progressStatus('Waiting For Parts')}>
                        <Icon name="hourglass_empty" size={16} /> Wait For Parts
                      </button>
                      <button className="btn btn-success" onClick={() => progressStatus('Resolved')}>
                        <Icon name="check" size={16} /> Resolve Ticket
                      </button>
                    </div>
                  )}

                  {selectedIssue.status === 'Waiting For Parts' && (
                    <button className="btn btn-primary" onClick={() => progressStatus('Maintenance In Progress')}>
                      <Icon name="build" size={16} /> Resume Repair Work
                    </button>
                  )}

                  {selectedIssue.status === 'Resolved' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <button className="btn btn-secondary" onClick={() => progressStatus('Reopened')}>
                        <Icon name="replay" size={16} /> Reopen Ticket
                      </button>
                      <button className="btn btn-secondary" onClick={() => progressStatus('Closed')}>
                        <Icon name="lock" size={16} /> Close Ticket
                      </button>
                    </div>
                  )}

                  {selectedIssue.status === 'Closed' && (
                    <button className="btn btn-secondary" onClick={() => progressStatus('Reopened')}>
                      <Icon name="replay" size={16} /> Reopen Ticket
                    </button>
                  )}
                </div>
              </SectionCard>

              {/* Linked Asset */}
              <SectionCard title="Target Asset" subtitle="Click to inspect this asset in inventory">
                <button
                  className="btn btn-secondary"
                  onClick={() => navigateToAsset(selectedIssue.asset_id)}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: 12 }}
                >
                  <Icon name="inventory_2" size={18} style={{ color: 'var(--brand-primary-light)' }} />
                  <div style={{ textAlign: 'left', marginLeft: 4 }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>Linked Equipment ID</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click to view details & logs</div>
                  </div>
                </button>
              </SectionCard>

              {/* AI Triage suggestions */}
              {selectedIssue.ai_used === 1 ? (
                <SectionCard title="GenAI Auto-Triage Summary" subtitle="Deep diagnosis based on complaint text">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span className="ai-badge" style={{ width: 'fit-content' }}>AI SUGGESTIONS</span>
                    
                    {selectedIssue.ai_suggested_title && (
                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Suggested Title</span>
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{selectedIssue.ai_suggested_title}</span>
                      </div>
                    )}

                    {selectedIssue.ai_possible_causes && (
                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Likely Causes</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {JSON.parse(selectedIssue.ai_possible_causes).map((c, i) => (
                            <span key={i} className="chip" style={{ fontSize: '0.75rem', color: '#ea580c', background: 'rgba(234,88,12,0.06)', borderColor: 'rgba(234,88,12,0.15)' }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedIssue.ai_diagnostic_checks && (
                      <div>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>Initial Diagnostic Checks</span>
                        <ol style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {JSON.parse(selectedIssue.ai_diagnostic_checks).map((chk, i) => (
                            <li key={i}>{chk}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {selectedIssue.ai_pattern_warning && (
                      <div style={{
                        marginTop: 4, padding: 8, borderRadius: 8,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        display: 'flex', gap: 6, alignItems: 'flex-start'
                      }}>
                        <Icon name="warning" size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.76rem', color: '#fca5a5', lineHeight: 1.4 }}>{selectedIssue.ai_pattern_warning}</span>
                      </div>
                    )}
                  </div>
                </SectionCard>
              ) : (
                <div style={{
                  padding: 16, borderRadius: 16, background: 'rgba(99,102,241,0.02)',
                  border: '1px dashed var(--border-default)', textAlign: 'center', color: 'var(--text-muted)'
                }}>
                  <Icon name="smart_toy" size={24} style={{ opacity: 0.5, marginBottom: 6 }} />
                  <p style={{ fontSize: '0.78rem' }}>This issue ticket was filed manually. GenAI triage was not requested.</p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
