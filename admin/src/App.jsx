import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetails from './pages/AssetDetails'
import Issues from './pages/Issues'
import Maintenance from './pages/Maintenance'
import QrCodes from './pages/QrCodes'
import Analytics from './pages/Analytics'
import History from './pages/History'
import Users from './pages/Users'
import Settings from './pages/Settings'
import { ToastContainer, showToast } from './components/UI'
import { StatsAPI, IssueAPI, MOCK } from './api'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [backendOffline, setBackendOffline] = useState(true)
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [issuesCount, setIssuesCount] = useState(0)

  // Asset detail inspection stack
  const [inspectedAsset, setInspectedAsset] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Require a logged-in session — this SPA holds internal, role-gated pages
  useEffect(() => {
    let session = null
    try { session = JSON.parse(localStorage.getItem('maintainiq_auth') || 'null') } catch {}
    if (!session?.token) {
      window.location.replace('../auth.html')
    }
  }, [])

  // Test backend connectivity on startup
  useEffect(() => {
    StatsAPI.stats()
      .then(res => {
        setBackendOffline(false)
        setStats(res)
        showToast('Successfully synchronized with FastAPI database.', 'success')
      })
      .catch(() => {
        // Fallback to high-fidelity mock data
        setBackendOffline(true)
        setStats(MOCK.stats)
        showToast('FastAPI server offline. Running in sandbox offline demo mode.', 'warning')
      })
  }, [])

  // Sync data regularly
  const reloadData = () => {
    if (backendOffline) {
      // Reload mock stats
      // Active issues count
      const activeCount = MOCK.issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length
      const pendingMaint = MOCK.issues.filter(i => ['Assigned', 'Inspection Started', 'Maintenance In Progress'].includes(i.status)).length
      
      const newStats = {
        ...MOCK.stats,
        total_assets: MOCK.assets.length,
        active_issues: activeCount,
        pending_maintenance: pendingMaint,
        operational_rate: parseFloat((MOCK.assets.filter(a => a.status === 'Operational').length / MOCK.assets.length * 100).toFixed(1)) || 90.0
      }
      setStats(newStats)
      setLogs(MOCK.logs)
      setIssuesCount(activeCount)
      return
    }

    Promise.all([StatsAPI.stats(), StatsAPI.logs()])
      .then(([statsRes, logsRes]) => {
        setStats(statsRes)
        setLogs(logsRes)
        setIssuesCount(statsRes.active_issues)
      })
      .catch(e => console.error(e))
  }

  useEffect(() => {
    reloadData()
  }, [backendOffline, activeTab])

  const handleAssetInspect = (asset, tab = 'info') => {
    setInspectedAsset(asset)
    setActiveTab('asset-details')
    // We can pass default tab
  }

  const handleBackToAssets = () => {
    setActiveTab('assets')
    setInspectedAsset(null)
  }

  const renderActivePage = () => {
    // If search filter is active and we type, we can filter components
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            logs={logs}
            assets={MOCK.assets}
            onNav={setActiveTab}
          />
        )
      case 'assets':
        return (
          <Assets
            backendOffline={backendOffline}
            onAssetInspect={handleAssetInspect}
          />
        )
      case 'asset-details':
        return inspectedAsset ? (
          <AssetDetails
            asset={inspectedAsset}
            backendOffline={backendOffline}
            onBack={handleBackToAssets}
            onAddMaintenance={reloadData}
          />
        ) : (
          <Assets
            backendOffline={backendOffline}
            onAssetInspect={handleAssetInspect}
          />
        )
      case 'issues':
        return (
          <Issues
            backendOffline={backendOffline}
            onAssetInspect={handleAssetInspect}
          />
        )
      case 'maintenance':
        return (
          <Maintenance
            backendOffline={backendOffline}
            onAssetInspect={handleAssetInspect}
          />
        )
      case 'qr':
        return (
          <QrCodes
            backendOffline={backendOffline}
          />
        )
      case 'analytics':
        return <Analytics />
      case 'history':
        return (
          <History
            backendOffline={backendOffline}
          />
        )
      case 'users':
        return (
          <Users
            backendOffline={backendOffline}
          />
        )
      case 'settings':
        return (
          <Settings
            backendOffline={backendOffline}
            toggleBackendMode={() => {
              const nextMode = !backendOffline
              setBackendOffline(nextMode)
              showToast(
                nextMode
                  ? 'Switched to sandbox local mock mode.'
                  : 'Attempting connection to live database...',
                'info'
              )
            }}
          />
        )
      default:
        return <Dashboard stats={stats} logs={logs} assets={MOCK.assets} />
    }
  }

  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard Overview',
      assets: 'Asset Registry Inventory',
      'asset-details': 'Asset Specifications & Audits',
      issues: 'Maintenance Tickets',
      maintenance: 'Service Records',
      qr: 'Printable QR Label sheets',
      analytics: 'Maintenance Analytics',
      history: 'Activity Audits',
      users: 'User access levels',
      settings: 'System configuration'
    }
    return titles[activeTab] || 'MaintainIQ Control Panel'
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        active={activeTab}
        onNav={(tab) => {
          setActiveTab(tab)
          setInspectedAsset(null)
        }}
        issueCount={issuesCount}
      />

      {/* Main Panel Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header Search & Actions */}
        <Header
          title={getPageTitle()}
          onNav={(tab) => {
            setActiveTab(tab)
            setInspectedAsset(null)
          }}
          issueCount={issuesCount}
          onSearch={(query) => {
            setSearchQuery(query)
            // Can pass this query to filter downstream lists
          }}
        />

        {/* Dynamic page render */}
        <main className="main-content">
          {renderActivePage()}
        </main>
      </div>

      {/* Global alerts */}
      <ToastContainer />
    </div>
  )
}
