import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { StatCard, SectionCard, Icon, StatusBadge, EmptyState } from '../components/UI'
import { MOCK } from '../api'

const AREA_DATA = [
  { month: 'Jan', operational: 88, issues: 7 },
  { month: 'Feb', operational: 91, issues: 5 },
  { month: 'Mar', operational: 85, issues: 10 },
  { month: 'Apr', operational: 93, issues: 4 },
  { month: 'May', operational: 89, issues: 8 },
  { month: 'Jun', operational: 95, issues: 3 },
  { month: 'Jul', operational: 89, issues: 12 },
]

const STATUS_COLORS = {
  Operational: '#10b981',
  'Issue Reported': '#f59e0b',
  'Under Inspection': '#06b6d4',
  'Under Maintenance': '#6366f1',
  'Out of Service': '#ef4444',
}

const PRIORITY_COLORS = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' }

export default function Dashboard({ stats, logs, assets, onNav }) {
  const s = stats || MOCK.stats
  const recentAssets = (assets || MOCK.assets).slice(0, 5)
  const recentLogs = (logs || MOCK.logs).slice(0, 6)

  const statusData = Object.entries(s.status_distribution || {}).map(([name, value]) => ({ name, value }))
  const priorityData = Object.entries(s.priority_distribution || {}).map(([name, value]) => ({ name, value }))
  const categoryData = Object.entries(s.category_distribution || {}).map(([name, value]) => ({ name, value: value }))

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="gradient-text">Control Center</span>
          </h1>
          <p className="page-subtitle">
            Real-time overview of MaintainIQ — {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onNav?.('assets')}>
            <Icon name="inventory_2" size={16} /> View Assets
          </button>
          <button className="btn btn-primary" onClick={() => onNav?.('issues')}>
            <Icon name="add_alert" size={16} /> Active Issues
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon="inventory_2" iconBg="rgba(99,102,241,0.12)" iconColor="#818cf8"
          label="Total Assets" value={s.total_assets}
          accent="var(--brand-primary)"
        />
        <StatCard
          icon="report_problem" iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b"
          label="Active Issues" value={s.active_issues}
          accent="#f59e0b"
        />
        <StatCard
          icon="build" iconBg="rgba(6,182,212,0.12)" iconColor="#06b6d4"
          label="Pending Maintenance" value={s.pending_maintenance}
          accent="#06b6d4"
        />
        <StatCard
          icon="verified" iconBg="rgba(16,185,129,0.12)" iconColor="#10b981"
          label="Operational Rate" value={`${s.operational_rate}%`}
          accent="#10b981"
          change="+2.1% this week" changeDir="up"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>
        {/* Operational Trend */}
        <SectionCard
          title="Asset Health Trend"
          subtitle="Monthly operational rate vs active issues"
          action={
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 99 }}>
              Last 7 months
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={AREA_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="opGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="issueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} labelStyle={{ color: '#f1f5f9', fontWeight: 700 }} />
              <Area type="monotone" dataKey="operational" stroke="#10b981" strokeWidth={2} fill="url(#opGrad)" name="Operational %" />
              <Area type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={2} fill="url(#issueGrad)" name="Active Issues" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Status Distribution Pie */}
        <SectionCard title="Status Distribution" subtitle="Current asset status breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {statusData.map(entry => (
              <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[entry.name] || '#6366f1', flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{entry.name}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{entry.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Category Bar Chart */}
        <SectionCard title="Assets by Category" subtitle="Distribution across departments">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Assets" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Priority Distribution */}
        <SectionCard title="Issue Priority Breakdown" subtitle="Active issues by urgency level">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Issues">
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.name] || '#6366f1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Recent Assets + Activity Log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Recent Assets */}
        <SectionCard
          title="Recent Assets"
          subtitle="Latest registered and updated assets"
          noPad
          action={
            <button className="btn btn-secondary btn-sm" onClick={() => onNav?.('assets')}>
              View All <Icon name="arrow_forward" size={14} />
            </button>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAssets.map(a => (
                <tr key={a.id}>
                  <td><span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--brand-primary-light)' }}>{a.asset_code}</span></td>
                  <td><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</span><br /><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.location}</span></td>
                  <td><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{a.category}</span></td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* Activity Log */}
        <SectionCard title="Activity Log" subtitle="Recent system events" action={
          <button className="btn btn-secondary btn-sm" onClick={() => onNav?.('history')}>See All</button>
        }>
          <div className="timeline">
            {recentLogs.length === 0 && <EmptyState icon="history" title="No recent activity" />}
            {recentLogs.map((log, i) => {
              const typeConfig = {
                create: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: 'add_circle' },
                alert:  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: 'warning' },
                update: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: 'edit' },
              }
              const cfg = typeConfig[log.type] || typeConfig.update
              return (
                <div key={log.id || i} className="timeline-item">
                  <div className="timeline-dot" style={{ background: cfg.bg, color: cfg.color }}>
                    <Icon name={cfg.icon} size={16} filled />
                  </div>
                  <div className="timeline-content">
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>{log.message || log.details}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {log.actor && <strong>{log.actor} · </strong>}
                      {log.action && <span>{log.action} · </span>}
                      {new Date(log.timestamp).toLocaleString('en-PK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
