import React, { useState, useEffect } from 'react'
import {
  SectionCard, FilterBar, Pagination, Icon, StatusBadge, EmptyState
} from '../components/UI'
import { MaintenanceAPI, MOCK } from '../api'

export default function Maintenance({ backendOffline, onAssetInspect }) {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All Statuses')
  const [loading, setLoading] = useState(false)

  const fetchRecords = () => {
    setLoading(true)
    if (backendOffline) {
      let filtered = [...MOCK.maintenance]
      if (search) {
        filtered = filtered.filter(r =>
          r.notes.toLowerCase().includes(search.toLowerCase()) ||
          r.technician_name.toLowerCase().includes(search.toLowerCase()) ||
          (r.parts_used && r.parts_used.toLowerCase().includes(search.toLowerCase()))
        )
      }
      if (status !== 'All Statuses') {
        filtered = filtered.filter(r => r.status === status)
      }
      setTotal(filtered.length)
      setRecords(filtered.slice((page - 1) * 8, page * 8))
      setLoading(false)
      return
    }

    const params = {
      skip: (page - 1) * 8,
      limit: 8
    }

    MaintenanceAPI.list(params)
      .then(res => {
        let data = res
        if (search) {
          data = res.filter(r =>
            r.notes.toLowerCase().includes(search.toLowerCase()) ||
            r.technician_name.toLowerCase().includes(search.toLowerCase()) ||
            (r.parts_used && r.parts_used.toLowerCase().includes(search.toLowerCase()))
          )
        }
        if (status !== 'All Statuses') {
          data = data.filter(r => r.status === status)
        }
        setRecords(data.slice(0, 8))
        setTotal(data.length)
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRecords()
  }, [page, search, status, backendOffline])

  const inspectAssetByRecord = (assetId) => {
    let found = null
    if (backendOffline) {
      found = MOCK.assets.find(a => a.id === assetId)
    } else {
      found = MOCK.assets.find(a => a.id === assetId)
    }
    if (found) {
      onAssetInspect?.(found)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Service & Maintenance Records</h1>
          <p className="page-subtitle">Logs of all equipment service details, parts replaced, and costs incurred</p>
        </div>
      </div>

      {/* Filter and Table */}
      <SectionCard noPad>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <FilterBar
            search={search}
            onSearch={setSearch}
            placeholder="Search service notes, technicians, or parts..."
            filters={[
              {
                value: status,
                onChange: setStatus,
                options: [
                  { label: 'All Statuses', value: 'All Statuses' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Scheduled', value: 'Scheduled' },
                  { label: 'Cancelled', value: 'Cancelled' }
                ]
              }
            ]}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Target Asset</th>
                <th>Service Notes</th>
                <th>Technician</th>
                <th>Dates</th>
                <th>Parts Replaced</th>
                <th>Labor Cost</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: 12 }}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <EmptyState title="No maintenance logs found" icon="build" />
                  </td>
                </tr>
              ) : (
                records.map(rec => {
                  const targetAssetObj = (MOCK.assets).find(a => a.id === rec.asset_id)
                  return (
                    <tr key={rec.id}>
                      <td>
                        {targetAssetObj ? (
                          <button
                            onClick={() => inspectAssetByRecord(rec.asset_id)}
                            style={{
                              background: 'none', border: 'none', padding: 0, textalign: 'left',
                              cursor: 'pointer', display: 'flex', flexDirection: 'column'
                            }}
                          >
                            <span style={{ fontWeight: 700, color: 'var(--brand-primary-light)', fontSize: '0.84rem' }}>
                              {targetAssetObj.asset_code}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              {targetAssetObj.name}
                            </span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>Asset #{rec.asset_id}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', maxWidth: 280, lineHeight: 1.4 }}>
                          {rec.notes}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{rec.technician_name}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>End: {rec.end_date}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>Start: {rec.start_date}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {rec.parts_used || <span style={{ color: 'var(--text-muted)' }}>None</span>}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ${(rec.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={rec.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} pageSize={8} onPage={setPage} />
      </SectionCard>
    </div>
  )
}
