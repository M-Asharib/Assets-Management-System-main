import React, { useState, useEffect } from 'react'
import {
  SectionCard, Icon, Modal, FormField, showToast, ConfirmDialog, DropMenu
} from '../components/UI'
import { UserAPI, MOCK } from '../api'

export default function Users({ backendOffline }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  
  const [formData, setFormData] = useState({ username: '', password: '', role: 'Technician' })
  const [errors, setErrors] = useState({})

  const fetchUsers = () => {
    setLoading(true)
    if (backendOffline) {
      // Create user lists from MOCK data
      const list = [
        { id: 1, username: 'admin_jameson', role: 'Admin' },
        { id: 2, username: 'tech_ali', role: 'Technician' },
        { id: 3, username: 'tech_zara', role: 'Technician' },
        { id: 4, username: 'tech_usman', role: 'Technician' },
        { id: 5, username: 'supervisor_bilal', role: 'Supervisor' },
      ]
      setUsers(list)
      setLoading(false)
      return
    }
    UserAPI.users()
      .then(res => setUsers(res))
      .catch(e => console.error(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [backendOffline])

  const validate = () => {
    const err = {}
    if (!formData.username.trim()) err.username = 'Username is required'
    if (!formData.password.trim() && !backendOffline) err.password = 'Password is required'
    setErrors(err)
    return Object.keys(err).length === 0
  }

  const handleAdd = (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    if (backendOffline) {
      const newUser = {
        id: users.length + 1,
        username: formData.username,
        role: formData.role
      }
      users.push(newUser)
      showToast(`User ${formData.username} registered as ${formData.role}!`, 'success')
      setShowAdd(false)
      setLoading(false)
      return
    }

    UserAPI.create(formData)
      .then(() => {
        showToast('User created successfully!', 'success')
        setShowAdd(false)
        fetchUsers()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const handleDelete = () => {
    setLoading(true)
    if (backendOffline) {
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
      showToast('User deleted successfully!', 'success')
      setLoading(false)
      return
    }
    UserAPI.delete(selectedUser.id)
      .then(() => {
        showToast('User deleted successfully!', 'success')
        fetchUsers()
      })
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  const openAdd = () => {
    setFormData({ username: '', password: '', role: 'Technician' })
    setErrors({})
    setShowAdd(true)
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users & Authorization</h1>
          <p className="page-subtitle">Manage administrative access control roles (Admins, Technicians, Supervisors)</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Icon name="person_add" size={18} /> Add New User
        </button>
      </div>

      <SectionCard title="Registered Team Directory" subtitle="User lists and role assignments" noPad>
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>System Role</th>
              <th style={{ width: 140 }}>Authorization Level</th>
              <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="account_circle" size={16} style={{ color: 'var(--text-muted)' }} />
                    {u.username}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: u.role === 'Admin' ? '#10b981' : u.role === 'Supervisor' ? '#06b6d4' : '#818cf8'
                  }}>
                    {u.role}
                  </span>
                </td>
                <td>
                  <span className="chip" style={{ fontSize: '0.72rem' }}>
                    {u.role === 'Admin' ? 'Read / Write / Delete' : u.role === 'Supervisor' ? 'Read / Edit status' : 'Assigned tasks only'}
                  </span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  {u.username === 'admin_jameson' ? (
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Protected</span>
                  ) : (
                    <DropMenu
                      trigger={
                        <button className="btn-icon" style={{ padding: 4 }}>
                          <Icon name="more_vert" size={16} />
                        </button>
                      }
                      items={[
                        { label: 'Delete User Access', icon: 'delete', danger: true, onClick: () => { setSelectedUser(u); setShowDelete(true) } }
                      ]}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Add User Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Register New Team Member" size="modal-sm"
        footer={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>
              Create User
            </button>
          </>
        }
      >
        <form onSubmit={handleAdd}>
          <FormField label="Username" required error={errors.username}>
            <input
              placeholder="e.g. tech_kabeer"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
            />
          </FormField>
          
          <FormField label="Password" required={!backendOffline} error={errors.password}>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </FormField>

          <FormField label="System Role">
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="Admin">Admin (Full Control)</option>
              <option value="Technician">Technician (Task-oriented Access)</option>
              <option value="Supervisor">Supervisor (Approval & Oversight)</option>
            </select>
          </FormField>
        </form>
      </Modal>

      {/* Delete User */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Revoke User Access"
        message={`Are you sure you want to revoke system credentials for "${selectedUser?.username}"? They will lose access to report status changes.`}
      />
    </div>
  )
}
