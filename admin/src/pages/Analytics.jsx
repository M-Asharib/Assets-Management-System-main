import React from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { SectionCard, StatCard } from '../components/UI'

const MONTHLY_COSTS = [
  { month: 'Jan', cost: 15000 },
  { month: 'Feb', cost: 24000 },
  { month: 'Mar', cost: 18500 },
  { month: 'Apr', cost: 32000 },
  { month: 'May', cost: 28000 },
  { month: 'Jun', cost: 41000 },
  { month: 'Jul', cost: 29500 },
]

const MTTR_DATA = [
  { month: 'Jan', mttr: 4.2 },
  { month: 'Feb', mttr: 3.8 },
  { month: 'Mar', mttr: 4.5 },
  { month: 'Apr', mttr: 3.2 },
  { month: 'May', mttr: 3.0 },
  { month: 'Jun', mttr: 2.7 },
  { month: 'Jul', mttr: 2.4 },
]

export default function Analytics() {
  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Maintenance Analytics</h1>
          <p className="page-subtitle">Diagnostic reports, cost metrics, and system key performance indicators</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          icon="timer" iconBg="rgba(245,158,11,0.12)" iconColor="#f59e0b"
          label="Mean Time To Repair (MTTR)" value="2.4 Hours"
          change="-32% from Q1" changeDir="up"
          accent="#f59e0b"
        />
        <StatCard
          icon="payments" iconBg="rgba(16,185,129,0.12)" iconColor="#10b981"
          label="Total Maintenance Spend" value="$188,000"
          change="+12% budget utilization" changeDir="down"
          accent="#10b981"
        />
        <StatCard
          icon="health_and_safety" iconBg="rgba(6,182,212,0.12)" iconColor="#06b6d4"
          label="Asset Reliability Index" value="96.2%"
          change="+0.8% increase" changeDir="up"
          accent="#06b6d4"
        />
        <StatCard
          icon="engineering" iconBg="rgba(99,102,241,0.12)" iconColor="#818cf8"
          label="Preventive Maint Ratio" value="74%"
          change="Optimal range target" changeDir="up"
          accent="#6366f1"
        />
      </div>

      {/* Charts section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SectionCard title="Maintenance Expenses Summary" subtitle="Monthly cost breakdown of repairs ($)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MONTHLY_COSTS} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Bar dataKey="cost" fill="#6366f1" radius={[4, 4, 0, 0]} name="Repair Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Mean Time to Repair (MTTR) Trend" subtitle="Average hours to resolve issues monthly">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={MTTR_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e2a42', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }} />
              <Line type="monotone" dataKey="mttr" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} name="MTTR (Hours)" />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <SectionCard title="Asset Failure Patterns" subtitle="Category distribution of failure incidents">
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Preventive vs Reactive Repairs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Preventive Servicing</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>74%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '74%', background: '#10b981' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Reactive Servicing</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>26%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '26%', background: '#f59e0b' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1, minWidth: 280 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Critical Failure Root Causes</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                <li>🔧 Mechanical Wear & Friction (34% of cases)</li>
                <li>⚡ Electrical surge & Voltage drops (28% of cases)</li>
                <li>🌡️ Thermal / Compressor overheating (18% of cases)</li>
                <li>💻 Firmware mismatch / Node crash (12% of cases)</li>
                <li>🧹 Dust obstruction & Poor ventilation (8% of cases)</li>
              </ul>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
