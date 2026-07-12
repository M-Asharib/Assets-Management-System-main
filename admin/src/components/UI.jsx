// ============================================================
//  Shared UI Components for MaintainIQ Admin
// ============================================================
import React, { useState, useEffect, useRef } from 'react'

// ─── Icon (Google Material Symbols) ────────────────────────────
export function Icon({ name, size = 20, style = {}, className = '', filled = false }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400`, ...style }}
    >
      {name}
    </span>
  )
}

// ─── Status Badge ────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    'Operational':           'operational',
    'Issue Reported':        'issue',
    'Under Inspection':      'inspection',
    'Under Maintenance':     'maintenance',
    'Out of Service':        'offline',
    'Retired':               'retired',
    'Resolved':              'resolved',
    'Closed':                'closed',
    'Reported':              'reported',
    'Assigned':              'assigned',
    'Inspection Started':    'inspection',
    'Maintenance In Progress':'maintenance',
    'Waiting For Parts':     'issue',
    'Reopened':              'issue',
    'Scheduled':             'scheduled',
    'Completed':             'completed',
    'Cancelled':             'cancelled',
    'Online':                'operational',
    'Offline':               'offline',
    'Maintenance':           'maintenance',
  }
  const cls = map[status] || 'muted'
  return <span className={`badge badge-${cls}`}>{status}</span>
}

// ─── Priority Badge ──────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const cls = (priority || '').toLowerCase()
  return <span className={`badge badge-${cls}`}>{priority}</span>
}

// ─── Spinner ─────────────────────────────────────────────────
export function Spinner({ size = 20, color }) {
  return (
    <div
      className="loading-spinner"
      style={{ width: size, height: size, borderTopColor: color || 'var(--brand-primary)' }}
    />
  )
}

// ─── Modal ───────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h3>
          <button className="btn-icon" onClick={onClose} style={{ padding: 6 }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Toast System ────────────────────────────────────────────
const _toastListeners = []
export function showToast(message, type = 'info', duration = 3500) {
  const id = Date.now()
  _toastListeners.forEach(fn => fn({ id, message, type }))
  setTimeout(() => _toastListeners.forEach(fn => fn({ id, remove: true })), duration)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const fn = (t) => {
      if (t.remove) {
        setToasts(prev => prev.filter(x => x.id !== t.id))
      } else {
        setToasts(prev => [...prev, t])
      }
    }
    _toastListeners.push(fn)
    return () => { const i = _toastListeners.indexOf(fn); if (i > -1) _toastListeners.splice(i, 1) }
  }, [])

  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' }
  const colors = { success: '#10b981', error: '#ef4444', info: '#818cf8', warning: '#f59e0b' }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={icons[t.type] || 'info'} size={18} style={{ color: colors[t.type], flexShrink: 0 }} filled />
          <span style={{ flex: 1, fontSize: '0.84rem' }}>{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm`} onClick={() => { onConfirm(); onClose() }}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  )
}

// ─── Filter Bar ──────────────────────────────────────────────
export function FilterBar({ search, onSearch, filters = [], children, placeholder = 'Search...' }) {
  return (
    <div className="filter-bar">
      <div className="search-input" style={{ position: 'relative', minWidth: 260 }}>
        <Icon name="search" size={18} className="icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          style={{ paddingLeft: 36 }}
        />
      </div>
      {filters.map((f, i) => (
        <div key={i} className="select-wrapper" style={{ minWidth: f.width || 160 }}>
          <select value={f.value} onChange={e => f.onChange(e.target.value)}>
            {f.options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
      {children}
    </div>
  )
}

// ─── Pagination ──────────────────────────────────────────────
export function Pagination({ page, total, pageSize, onPage }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== '...') pages.push('...')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }} disabled={page === 1} onClick={() => onPage(page - 1)}>
          <Icon name="chevron_left" size={16} />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={i} style={{ padding: '6px 4px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>…</span>
            : <button
                key={p}
                className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 32, padding: '6px 8px' }}
                onClick={() => onPage(p)}
              >{p}</button>
        )}
        <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }} disabled={page === totalPages} onClick={() => onPage(page + 1)}>
          <Icon name="chevron_right" size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────
export function EmptyState({ icon = 'inbox', title = 'No data found', subtitle, action }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={48} style={{ opacity: 0.3 }} />
      <h3>{title}</h3>
      {subtitle && <p style={{ fontSize: '0.84rem' }}>{subtitle}</p>}
      {action}
    </div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────
export function StatCard({ icon, iconBg, iconColor, label, value, change, changeDir, accent }) {
  return (
    <div className="stat-card" style={{ '--accent-color': accent }}>
      <div className="stat-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon name={icon} size={22} filled />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {change !== undefined && (
        <div className={`stat-change ${changeDir}`}>
          <Icon name={changeDir === 'up' ? 'trending_up' : 'trending_down'} size={14} />
          {change}
        </div>
      )}
    </div>
  )
}

// ─── Section Card ────────────────────────────────────────────
export function SectionCard({ title, subtitle, action, children, style = {}, noPad = false }) {
  return (
    <div className="glass-card" style={{ overflow: 'hidden', ...style }}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            {title && <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h4>}
            {subtitle && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={noPad ? {} : { padding: '20px' }}>{children}</div>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────
export function Tabs({ items, active, onChange }) {
  return (
    <div className="tabs">
      {items.map(item => (
        <button
          key={item.id}
          className={`tab ${active === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon && <Icon name={item.icon} size={16} />}
          {item.label}
          {item.count !== undefined && (
            <span style={{
              marginLeft: 4, padding: '1px 6px', borderRadius: 99,
              background: active === item.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-elevated)',
              fontSize: '0.7rem', fontWeight: 700
            }}>{item.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Dropdown Menu ───────────────────────────────────────────
export function DropMenu({ trigger, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          borderRadius: 12, padding: 6, minWidth: 180, zIndex: 200,
          boxShadow: 'var(--shadow-lg)', animation: 'slideUp 0.15s ease'
        }}>
          {items.map((item, i) =>
            item.divider
              ? <div key={i} className="divider" style={{ margin: '4px 0' }} />
              : (
                <button
                  key={i}
                  onClick={() => { item.onClick?.(); setOpen(false) }}
                  disabled={item.disabled}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    padding: '9px 12px', border: 'none', background: 'none',
                    borderRadius: 8, cursor: 'pointer', fontSize: '0.84rem',
                    color: item.danger ? '#ef4444' : 'var(--text-primary)',
                    fontWeight: 500,
                    transition: 'background 0.15s',
                    opacity: item.disabled ? 0.4 : 1
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {item.icon && <Icon name={item.icon} size={16} style={{ color: item.danger ? '#ef4444' : 'var(--text-muted)' }} />}
                  {item.label}
                </button>
              )
          )}
        </div>
      )}
    </div>
  )
}

// ─── Form Input ─────────────────────────────────────────────
export function FormField({ label, required, error, children }) {
  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label} {required && <span style={{ color: 'var(--brand-danger)' }}>*</span>}
        </label>
      )}
      {children}
      {error && <p style={{ fontSize: '0.75rem', color: 'var(--brand-danger)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ─── Info Row ─────────────────────────────────────────────
export function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ minWidth: 140, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 2 }}>{label}</span>
      <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit' }}>{value || '—'}</span>
    </div>
  )
}
