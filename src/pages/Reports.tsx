import { useState, useEffect } from 'react'
import { FileText, Download, FileJson, FileSpreadsheet } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './ModulePage.css'
import './Reports.css'

const lc = (window as any).lapcharm

interface HistoryRow {
  id: number
  timestamp: string
  overall_score: number
  battery_score: number
  thermal_score: number
  disk_score: number
  cpuram_score: number
  battery_health_percent: number
  cpu_temp: number
  ram_used_percent: number
}

export default function Reports() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [days, setDays] = useState(7)

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.history?.get(days)
      if (res?.success) setHistory(res.data as HistoryRow[])
    }
    fetch()
  }, [days])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lapcharm-report-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  const exportCsv = () => {
    if (history.length === 0) return
    const headers = Object.keys(history[0]).join(',')
    const rows = history.map(r => Object.values(r).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lapcharm-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const exportPdf = () => {
    if (history.length === 0) return
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(79, 156, 249) // blue
    doc.text('LapCharm Health Report', 14, 22)
    
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30)
    
    // Summary
    const latest = history[history.length - 1]
    doc.setFontSize(14)
    doc.setTextColor(0)
    doc.text('Latest Snapshot', 14, 45)
    
    doc.setFontSize(11)
    doc.text(`Overall Score: ${latest.overall_score}`, 14, 53)
    doc.text(`Battery Health: ${latest.battery_health_percent}% (Score: ${latest.battery_score})`, 14, 59)
    doc.text(`CPU Max Temp: ${latest.cpu_temp}°C (Score: ${latest.thermal_score})`, 14, 65)
    doc.text(`Storage Score: ${latest.disk_score}`, 14, 71)
    
    // Table
    const tableColumn = ["Date", "Score", "Battery", "Thermal", "Disk", "CPU/RAM"]
    const tableRows = history.map(row => [
      new Date(row.timestamp).toLocaleString(),
      row.overall_score,
      row.battery_score,
      row.thermal_score,
      row.disk_score,
      row.cpuram_score
    ])
    
    ;(doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'grid',
      headStyles: { fillColor: [79, 156, 249] }
    })
    
    doc.save(`lapcharm-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(79,156,249,0.1)' }}>
          <FileText size={24} color="var(--color-accent-blue)" />
        </div>
        <div>
          <h1 className="module-title">Reports & History</h1>
          <p className="module-subtitle">Health history, trends, and exports</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card reports-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <span className="stat-label">Show last</span>
          {[1, 7, 14, 30].map((d) => (
            <button
              key={d}
              className={`period-btn ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d === 1 ? '24h' : `${d}d`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button className="export-btn" onClick={exportJson}>
              <FileJson size={16} /> JSON
            </button>
            <button className="export-btn" onClick={exportCsv}>
              <FileSpreadsheet size={16} /> CSV
            </button>
            <button className="export-btn export-btn-primary" onClick={exportPdf}>
              <Download size={16} /> PDF Report
            </button>
        </div>
      </div>

      {/* History table */}
      <div className="card">
        <h2 className="card-section-title">Health History ({history.length} snapshots)</h2>
        {history.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0' }}>
            No history yet. Data is collected automatically every time you open the dashboard.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Overall</th>
                <th>Battery</th>
                <th>Thermal</th>
                <th>Disk</th>
                <th>CPU/RAM</th>
                <th>Batt Health</th>
                <th>CPU Temp</th>
                <th>RAM Used</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 50).map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: row.overall_score >= 70 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)' }}>
                    {row.overall_score}
                  </td>
                  <td>{row.battery_score}</td>
                  <td>{row.thermal_score}</td>
                  <td>{row.disk_score}</td>
                  <td>{row.cpuram_score}</td>
                  <td>{row.battery_health_percent?.toFixed(1)}%</td>
                  <td>{row.cpu_temp?.toFixed(1)}°C</td>
                  <td>{row.ram_used_percent?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
