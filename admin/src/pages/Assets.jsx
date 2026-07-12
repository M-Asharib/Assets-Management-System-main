import React, { useState, useEffect } from 'react'
import {
  SectionCard, FilterBar, Pagination, Icon, StatusBadge,
  Modal, FormField, showToast, ConfirmDialog, InfoRow, DropMenu
} from '../components/UI'
import { AssetAPI, MetaAPI, MOCK } from '../api'

export default function Assets({ backendOffline, onAssetInspect }) {
  const [assets, setAssets] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [status, setStatus] = useState('All Statuses')

  // Metadata
  const [categories, setCategories] = useState([])
  const [locations, setLocations] = useState([])

  // Modals
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '', category: '', location: '', status: 'Operational',
    condition: 'Excellent', serial: '', value: 0, purchase_date: '',
    description: '', asset_code: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Fetch meta
  useEffect(() => {
    if (backendOffline) {
      setCategories([...new Set(MOCK.assets.map(a => a.category))])
      setLocations([...new Set(MOCK.assets.map(a => a.location))])
      return
    }
    Promise.all([MetaAPI.categories(), MetaAPI.locations()])
      .then(([cats, locs]) => {
        setCategories(cats)
        setLocations(locs)
      })
      .catch(e => console.error(e))
  }, [backendOffline])

  // Fetch assets
  const fetchAssets = () => {
    setLoading(true)
    if (backendOffline) {
      let filtered = [...MOCK.assets]
      if (search) {
        filtered = filtered.filter(a =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.asset_code.toLowerCase().includes(search.toLowerCase()) ||
          a.location.toLowerCase().includes(search.toLowerCase())
        )
      }
      if (category !== 'All Categories') {
        filtered = filtered.filter(a => a.category === category)
      }
      if (status !== 'All Statuses') {
        filtered = filtered.filter(a => a.status === status)
      }
      setTotal(filtered.length)
      setAssets(filtered.slice((page - 1) * 8, page * 8))
      setLoading(false)
      return
    }

    const params = {
      skip: (page - 1) * 8,
      limit: 8,
      q: search || undefined,
      category: category === 'All Categories' ? undefined : category,
      status: status === 'All Statuses' ? undefined : status
    }

    AssetAPI.list(params)
      .then(res => {
        setAssets(res.data)
        setTotal(res.total)
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAssets()
  }, [page, search, category, status, backendOffline])

  const validate = () => {
    const errors = {}
    if (!formData.name.trim()) errors.name = 'Asset name is required'
    if (!formData.category.trim()) errors.category = 'Category is required'
    if (!formData.location.trim()) errors.location = 'Location is required'
    if (formData.value < 0) errors.value = 'Value cannot be negative'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    if (backendOffline) {
      const code = formData.asset_code || `#MQ-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
      // Check duplicate code
      const duplicate = MOCK.assets.some(a => a.asset_code === code)
      if (duplicate) {
        showToast('Asset ID / Code already exists', 'error')
        setLoading(false)
        return
      }

      const newAsset = {
        id: MOCK.assets.length + 1,
        asset_code: code,
        name: formData.name,
        category: formData.category,
        location: formData.location,
        status: formData.status,
        condition: formData.condition,
        serial: formData.serial || null,
        value: Number(formData.value) || 0,
        purchase_date: formData.purchase_date || new Date().toISOString().split('T')[0],
        last_service_date: null,
        next_service_date: null,
        description: formData.description || null,
        qr_code_url: `/public/asset/${code}`,
        issues: [],
        maintenance_records: [],
        history: [{
          id: Date.now(),
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          action: 'Registered',
          details: `Asset registered with custom code ${code}.`
        }]
      }
      MOCK.assets.unshift(newAsset)
      // Add log
      MOCK.logs.unshift({
        id: Date.now(),
        asset_id: newAsset.id,
        timestamp: new Date().toISOString(),
        actor: 'Admin',
        action: 'Registered',
        details: `Asset "${formData.name}" registered successfully.`
      })

      showToast('Asset registered successfully', 'success')
      setShowAdd(false)
      fetchAssets()
      setLoading(false)
      return
    }

    AssetAPI.create(formData)
      .then(() => {
        showToast('Asset registered successfully', 'success')
        setShowAdd(false)
        fetchAssets()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    if (backendOffline) {
      const idx = MOCK.assets.findIndex(a => a.id === selectedAsset.id)
      if (idx > -1) {
        const prev = MOCK.assets[idx]
        const updated = {
          ...prev,
          name: formData.name,
          category: formData.category,
          location: formData.location,
          status: formData.status,
          condition: formData.condition,
          serial: formData.serial || null,
          value: Number(formData.value) || 0,
          purchase_date: formData.purchase_date,
          description: formData.description
        }
        MOCK.assets[idx] = updated
        // History & logs
        const changes = []
        if (prev.status !== updated.status) changes.push(`Status changed from ${prev.status} to ${updated.status}`)
        if (prev.condition !== updated.condition) changes.push(`Condition changed from ${prev.condition} to ${updated.condition}`)
        MOCK.logs.unshift({
          id: Date.now(),
          asset_id: updated.id,
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          action: 'Updated',
          details: changes.length ? changes.join('; ') : `Asset descriptive metadata updated.`
        })
      }
      showToast('Asset updated successfully', 'success')
      setShowEdit(false)
      fetchAssets()
      setLoading(false)
      return
    }

    AssetAPI.update(selectedAsset.id, formData)
      .then(() => {
        showToast('Asset updated successfully', 'success')
        setShowEdit(false)
        fetchAssets()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const handleDelete = async () => {
    setLoading(true)
    if (backendOffline) {
      MOCK.assets = MOCK.assets.filter(a => a.id !== selectedAsset.id)
      showToast('Asset deleted successfully', 'success')
      fetchAssets()
      setLoading(false)
      return
    }

    AssetAPI.delete(selectedAsset.id)
      .then(() => {
        showToast('Asset deleted successfully', 'success')
        fetchAssets()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const openAdd = () => {
    setFormData({
      name: '', category: categories[0] || 'Computing Hardware', location: locations[0] || 'HQ Server Room', status: 'Operational',
      condition: 'Excellent', serial: '', value: 0, purchase_date: new Date().toISOString().split('T')[0],
      description: '', asset_code: ''
    })
    setFormErrors({})
    setShowAdd(true)
  }

  const openEdit = (asset) => {
    setSelectedAsset(asset)
    setFormData({
      name: asset.name, category: asset.category, location: asset.location, status: asset.status,
      condition: asset.condition || 'Excellent', serial: asset.serial || '', value: asset.value || 0,
      purchase_date: asset.purchase_date || '', description: asset.description || '', asset_code: asset.asset_code
    })
    setFormErrors({})
    setShowEdit(true)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Asset Inventory</h1>
          <p className="page-subtitle">Inspect, register and update your physical and digital assets</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="add" size={18} /> Register Asset
        </button>
      </div>

      {/* Filter and Table */}
      <SectionCard noPad>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <FilterBar
            search={search}
            onSearch={setSearch}
            filters={[
              {
                value: category,
                onChange: setCategory,
                options: [{ label: 'All Categories', value: 'All Categories' }, ...categories.map(c => ({ label: c, value: c }))]
              },
              {
                value: status,
                onChange: setStatus,
                options: [
                  { label: 'All Statuses', value: 'All Statuses' },
                  { label: 'Operational', value: 'Operational' },
                  { label: 'Issue Reported', value: 'Issue Reported' },
                  { label: 'Under Inspection', value: 'Under Inspection' },
                  { label: 'Under Maintenance', value: 'Under Maintenance' },
                  { label: 'Out of Service', value: 'Out of Service' },
                  { label: 'Retired', value: 'Retired' }
                ]
              }
            ]}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Asset Code</th>
                <th>Asset Details</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Value</th>
                <th>Status</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && assets.length === 0 ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} style={{ padding: 12 }}>
                      <div className="skeleton" style={{ height: 28, width: '100%' }} />
                    </td>
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}>
                    <EmptyState title="No assets match criteria" icon="inventory_2" />
                  </td>
                </tr>
              ) : (
                assets.map(asset => (
                  <tr key={asset.id}>
                    <td>
                      <span className="font-mono" style={{ color: 'var(--brand-primary-light)', fontWeight: 600 }}>
                        {asset.asset_code}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{asset.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Icon name="location_on" size={14} style={{ color: 'var(--text-muted)' }} />
                        {asset.location}
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{asset.category}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.8rem', fontWeight: 600,
                        color: asset.condition === 'Excellent' ? '#10b981' : asset.condition === 'Good' ? '#06b6d4' : asset.condition === 'Fair' ? '#f59e0b' : '#ef4444'
                      }}>
                        {asset.condition || 'Excellent'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                        ${(asset.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={asset.status} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <DropMenu
                        trigger={
                          <button className="btn-icon" style={{ padding: 5 }}>
                            <Icon name="more_vert" size={18} />
                          </button>
                        }
                        items={[
                          { label: 'Inspect Asset Details', icon: 'visibility', onClick: () => onAssetInspect?.(asset) },
                          { label: 'Edit Asset Details', icon: 'edit', onClick: () => openEdit(asset) },
                          { label: 'Print QR Label', icon: 'qr_code', onClick: () => onAssetInspect?.(asset, 'qr') },
                          { divider: true },
                          { label: 'Delete Asset', icon: 'delete', danger: true, onClick: () => { setSelectedAsset(asset); setShowDelete(true) } }
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={total} pageSize={8} onPage={setPage} />
      </SectionCard>

      {/* Add Asset Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register New Asset" size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={loading}>
              {loading ? 'Registering...' : 'Register Asset'}
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Asset ID / Code (Auto-generated if empty)" error={formErrors.asset_code}>
            <input
              placeholder="e.g. #AC-8842-X"
              value={formData.asset_code}
              onChange={e => setFormData({ ...formData, asset_code: e.target.value })}
            />
          </FormField>
          <FormField label="Asset Name" required error={formErrors.name}>
            <input
              placeholder="e.g. Quantum Core Server S2"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category" required error={formErrors.category}>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="New Category">+ Add New Category</option>
            </select>
          </FormField>
          <FormField label="Location" required error={formErrors.location}>
            <select
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            >
              <option value="">Select Location</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Operational">Operational</option>
              <option value="Issue Reported">Issue Reported</option>
              <option value="Under Inspection">Under Inspection</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Retired">Retired</option>
            </select>
          </FormField>
          <FormField label="Condition">
            <select
              value={formData.condition}
              onChange={e => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </FormField>
          <FormField label="Serial Number">
            <input
              placeholder="e.g. SN-90210-BC"
              value={formData.serial}
              onChange={e => setFormData({ ...formData, serial: e.target.value })}
            />
          </FormField>
          <FormField label="Asset Value ($)" error={formErrors.value}>
            <input
              type="number"
              placeholder="e.g. 15420000"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
            />
          </FormField>
          <FormField label="Purchase Date">
            <input
              type="date"
              value={formData.purchase_date}
              onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
            />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Description">
              <textarea
                rows={3}
                placeholder="Detailed asset specifications, manual links, or extra details..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Edit Asset Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit Asset — ${formData.asset_code}`} size="modal-lg"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleEdit} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEdit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <FormField label="Asset Name" required error={formErrors.name}>
            <input
              placeholder="Asset Name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </FormField>
          <FormField label="Category" required error={formErrors.category}>
            <select
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Location" required error={formErrors.location}>
            <select
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            >
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="Operational">Operational</option>
              <option value="Issue Reported">Issue Reported</option>
              <option value="Under Inspection">Under Inspection</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Out of Service">Out of Service</option>
              <option value="Retired">Retired</option>
            </select>
          </FormField>
          <FormField label="Condition">
            <select
              value={formData.condition}
              onChange={e => setFormData({ ...formData, condition: e.target.value })}
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </FormField>
          <FormField label="Serial Number">
            <input
              placeholder="Serial Number"
              value={formData.serial}
              onChange={e => setFormData({ ...formData, serial: e.target.value })}
            />
          </FormField>
          <FormField label="Asset Value ($)" error={formErrors.value}>
            <input
              type="number"
              placeholder="Asset Value"
              value={formData.value}
              onChange={e => setFormData({ ...formData, value: e.target.value })}
            />
          </FormField>
          <FormField label="Purchase Date">
            <input
              type="date"
              value={formData.purchase_date}
              onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
            />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Description">
              <textarea
                rows={3}
                placeholder="Asset specifications..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Asset"
        message={`Are you sure you want to delete ${selectedAsset?.name || 'this asset'} (${selectedAsset?.asset_code})? This will permanently delete all associated issues, maintenance records, and event logs.`}
      />
    </div>
  )
}
