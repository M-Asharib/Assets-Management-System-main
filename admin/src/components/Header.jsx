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
      </div>
    </header>
  )
}
