import React, { useState, useEffect } from 'react'
import { SectionCard, FilterBar, Pagination, Icon } from '../components/UI'
import { MOCK } from '../api'

export default function History({ backendOffline }) {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [actor, setActor] = useState('All Actors')
  const [actionFilter, setActionFilter] = useState('All Actions')

  useEffect(() => {
    setLogs(MOCK.logs)
  }, [backendOffline])

  let filteredLogs = [...logs]
  if (search) {
    filteredLogs = filteredLogs.filter(l =>
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      (l.actor && l.actor.toLowerCase().includes(search.toLowerCase())) ||
      (l.action && l.action.toLowerCase().includes(search.toLowerCase()))
    )
  }
  if (actor !== 'All Actors') {
    filteredLogs = filteredLogs.filter(l => l.actor === actor)
  }
  if (actionFilter !== 'All Actions') {
    filteredLogs = filteredLogs.filter(l => l.action === actionFilter)
  }

  const actors = [...new Set(logs.map(l => l.actor).filter(Boolean))]
  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))]

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Immutable Audit Log</h1>
          <p className="page-subtitle">Security trail of all asset registry changes, issues filed, and maintenance audits</p>
        </div>
      </div>

      <SectionCard title="Lifecycle Audit Ledger" subtitle="Chronological ledger of events">
        <FilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search activity details..."
          filters={[
            {
              value: actor,
              onChange: setActor,
              options: [{ label: 'All Actors', value: 'All Actors' }, ...actors.map(a => ({ label: a, value: a }))]
            },
            {
              value: actionFilter,
              onChange: setActionFilter,
              options: [{ label: 'All Actions', value: 'All Actions' }, ...actions.map(act => ({ label: act, value: act }))]
            }
          ]}
        />

        <div className="timeline" style={{ marginTop: 24 }}>
          {filteredLogs.map((log, i) => (
            <div key={log.id || i} className="timeline-item">
              <div className="timeline-dot" style={{ background: 'var(--bg-elevated)', color: 'var(--brand-primary-light)' }}>
                <Icon name="history" size={16} />
              </div>
              <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{log.action}</h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: 4 }}>{log.details}</p>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 8 }}>
                  <span>Actor: <strong>{log.actor}</strong></span>
                  {log.asset_id && <span>· Asset Link: <strong className="font-mono">#{log.asset_id}</strong></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
