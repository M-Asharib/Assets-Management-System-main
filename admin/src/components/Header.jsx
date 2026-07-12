import React, { useState } from 'react'
import { Icon } from './UI'

export default function Header({ title, onSearch, issueCount = 0, onNav }) {
  const [q, setQ] = useState('')

  const handleSearch = (e) => {
    setQ(e.target.value)
    onSearch?.(e.target.value)
  }

  return (
    <header className="header">
      {/* Page title (hidden on mobile since sidebar has logo) */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
      </div>

      {/* Search */}
      <div className="header-search">
        <Icon name="search" size={18} className="search-icon" />
        <input
          value={q}
          onChange={handleSearch}
          placeholder="Search assets, issues, codes..."
          id="global-search"
        />
      </div>

      {/* Actions */}
      <div className="header-actions">
        <button
          className="btn-icon notif-dot"
          title="Issues"
          onClick={() => onNav?.('issues')}
          style={{ position: 'relative' }}
        >
          <Icon name="report_problem" size={20} />
        </button>

        <button className="btn-icon" title="Notifications">
          <Icon name="notifications" size={20} />
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)' }} />

        {/* Role badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10,
          padding: '6px 12px',
        }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.75rem', color: 'white'
          }}>A</div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>Admin</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 1 }}>Full Access</div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '2px 7px',
            borderRadius: 99, background: 'rgba(99,102,241,0.12)',
            color: 'var(--brand-primary-light)', fontSize: '0.65rem', fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase', marginLeft: 2
          }}>
            ADMIN
          </span>
        </div>
      </div>
    </header>
  )
}
