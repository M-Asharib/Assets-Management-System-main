import React from 'react'
import { Icon } from './UI'

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    ]
  },
  {
    section: 'Management',
    items: [
      { id: 'assets',       icon: 'inventory_2',    label: 'Assets',         badge: null },
      { id: 'issues',       icon: 'report_problem', label: 'Issues',         badge: 'issues' },
      { id: 'maintenance',  icon: 'build',          label: 'Maintenance',    badge: null },
      { id: 'qr',           icon: 'qr_code_scanner',label: 'QR Codes',       badge: null },
    ]
  },
  {
    section: 'Insights',
    items: [
      { id: 'analytics',  icon: 'bar_chart',    label: 'Analytics' },
      { id: 'history',    icon: 'history',      label: 'Asset History' },
    ]
  },
  {
    section: 'System',
    items: [
      { id: 'users',      icon: 'manage_accounts', label: 'Users & Roles' },
      { id: 'settings',   icon: 'settings',        label: 'System Settings' },
    ]
  }
]

export default function Sidebar({ active, onNav, issueCount = 0 }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">🔧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Maintain<span className="gradient-text">IQ</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
            Admin Portal · v1.0
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${active === item.id ? 'active' : ''}`}
                onClick={() => onNav(item.id)}
                style={{ width: '100%', textAlign: 'left' }}
              >
                <Icon name={item.icon} size={19} filled={active === item.id} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge === 'issues' && issueCount > 0 && (
                  <span className="nav-badge">{issueCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer User */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }}>
        <div style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '0.875rem', color: 'white', flexShrink: 0
        }}>A</div>
        <div>
          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>Administrator</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>admin@maintainiq.io</div>
        </div>
        <button className="btn-icon" style={{ marginLeft: 'auto', padding: 5 }}>
          <Icon name="logout" size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </aside>
  )
}
