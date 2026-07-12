import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { SectionCard, Icon, showToast } from '../components/UI'
import { AssetAPI, MOCK } from '../api'

export default function QrCodes({ backendOffline }) {
  const [selectedAssets, setSelectedAssets] = useState([])
  const [assets, setAssets] = useState([])
  const [qrCodes, setQrCodes] = useState({})

  useEffect(() => {
    if (backendOffline) {
      setAssets(MOCK.assets)
      return
    }
    AssetAPI.list({ limit: 500 })
      .then(res => setAssets(res.data))
      .catch(e => showToast(e.message, 'error'))
  }, [backendOffline])

  useEffect(() => {
    // Generate QR urls for all visible assets
    const qrMap = {}
    const generateAll = async () => {
      for (let a of assets) {
        const publicUrl = `${window.location.origin}/public.html?code=${encodeURIComponent(a.asset_code)}`
        try {
          const url = await QRCode.toDataURL(publicUrl, { width: 140, margin: 1 })
          qrMap[a.id] = url
        } catch (e) {
          console.error(e)
        }
      }
      setQrCodes(qrMap)
    }
    if (assets.length > 0) {
      generateAll()
    }
  }, [assets])

  const toggleSelect = (id) => {
    if (selectedAssets.includes(id)) {
      setSelectedAssets(prev => prev.filter(x => x !== id))
    } else {
      setSelectedAssets(prev => [...prev, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([])
    } else {
      setSelectedAssets(assets.map(a => a.id))
    }
  }

  const handlePrintBatch = () => {
    if (selectedAssets.length === 0) {
      showToast('Please select at least one asset to print labels!', 'warning')
      return
    }

    const items = assets.filter(a => selectedAssets.includes(a.id))
    const win = window.open('', '_blank')
    
    let htmlContent = `
      <html>
        <head>
          <title>Print Label Sheets - MaintainIQ</title>
          <style>
            body { font-family: sans-serif; background: #fff; margin: 0; padding: 20px; }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .label-card {
              border: 2px solid #000;
              padding: 16px;
              border-radius: 12px;
              text-align: center;
              page-break-inside: avoid;
              background: #fff;
            }
            .header-txt { font-size: 10px; font-weight: 800; color: #666; letter-spacing: 1.5px; text-transform: uppercase; }
            .title-txt { font-size: 16px; font-weight: 700; margin: 6px 0; color: #000; }
            .qr-img { width: 130px; height: 130px; margin: 8px 0; }
            .code-txt { font-family: monospace; font-size: 13px; font-weight: 800; color: #4f46e5; }
            .instr { font-size: 9px; color: #555; margin-top: 4px; }
            @media print {
              body { padding: 0; }
              .label-card { border-color: #000; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="grid-container">
    `

    items.forEach(item => {
      const qrSrc = qrCodes[item.id] || ''
      htmlContent += `
        <div class="label-card">
          <div class="header-txt">MaintainIQ Asset Management</div>
          <div class="title-txt">${item.name}</div>
          <img class="qr-img" src="${qrSrc}" />
          <div class="code-txt">${item.asset_code}</div>
          <div class="instr">Scan code to read safety details or report failure</div>
        </div>
      `
    })

    htmlContent += `
          </div>
        </body>
      </html>
    `

    win.document.write(htmlContent)
    win.document.close()
    showToast(`Sent ${selectedAssets.length} labels to printer!`, 'success')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Bulk QR Label Printing</h1>
          <p className="page-subtitle">Select multiple assets to generate and print ready-to-use physical equipment label sheets</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handlePrintBatch}
          disabled={selectedAssets.length === 0}
        >
          <Icon name="print" size={18} /> Print Selected Labels ({selectedAssets.length})
        </button>
      </div>

      <SectionCard
        title="Active QR Code Catalog"
        subtitle="Manage and select QR identifier mappings"
        action={
          <button className="btn btn-secondary btn-sm" onClick={toggleSelectAll}>
            {selectedAssets.length === assets.length ? 'Clear Selection' : 'Select All'}
          </button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {assets.map(a => {
            const isSelected = selectedAssets.includes(a.id)
            const qrSrc = qrCodes[a.id] || ''
            return (
              <div
                key={a.id}
                onClick={() => toggleSelect(a.id)}
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                  border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                  borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', cursor: 'pointer', position: 'relative',
                  transition: 'all 0.2s ease', boxShadow: isSelected ? 'var(--shadow-glow)' : 'none'
                }}
              >
                {/* Checkbox badge */}
                <div style={{
                  position: 'absolute', top: 12, right: 12, width: 20, height: 20,
                  borderRadius: 6, border: '2px solid var(--border-default)',
                  background: isSelected ? 'var(--brand-primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifycontent: 'center'
                }}>
                  {isSelected && <Icon name="check" size={16} style={{ color: 'white', fontWeight: 'bold' }} />}
                </div>

                <div style={{ background: 'white', padding: 8, borderRadius: 12, marginTop: 8 }}>
                  {qrSrc ? (
                    <img src={qrSrc} alt="QR Preview" style={{ width: 110, height: 110, display: 'block' }} />
                  ) : (
                    <div style={{ width: 110, height: 110, background: '#eee', borderRadius: 8 }} />
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 12, width: '100%' }}>
                  <div style={{
                    fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {a.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--brand-primary-light)', marginTop: 4, fontWeight: 700 }}>
                    {a.asset_code}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {a.location}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
