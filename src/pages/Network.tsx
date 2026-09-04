import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Wifi, Cable, ArrowDown, ArrowUp } from 'lucide-react'
import { formatBytes } from '../utils/formatters'
import './ModulePage.css'

const lc = (window as any).lapcharm

function SignalBars({ percent }: { percent: number }) {
  const bars = [25, 50, 75, 100]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {bars.map((threshold, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: `${25 * (i + 1)}%`,
            borderRadius: 2,
            background: percent >= threshold
              ? 'var(--color-accent-blue)'
              : 'var(--color-bg-elevated)',
            transition: 'background 0.3s ease'
          }}
        />
      ))}
    </div>
  )
}

export default function Network() {
  const { network, setNetwork } = useHealthStore()

  useEffect(() => {
    const fetchData = async () => {
      const res = await lc?.network?.get()
      if (res?.success) setNetwork(res.data)
    }
    fetchData()
    const id = setInterval(fetchData, 15000)
    return () => clearInterval(id)
  }, [])

  const n = network
  const conn = n?.connectionType ?? (n?.wifiConnected ? 'wifi' : 'offline')
  const subtitle =
    conn === 'wifi' && n?.wifiSsid ? `Connected to ${n.wifiSsid}` :
    conn === 'ethernet' ? 'Ethernet connected' :
    'No active connection'

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(34,211,238,0.1)' }}>
          {conn === 'ethernet'
            ? <Cable size={24} color="var(--color-accent-cyan)" />
            : <Wifi size={24} color="var(--color-accent-cyan)" />}
        </div>
        <div>
          <h1 className="module-title">Network</h1>
          <p className="module-subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={n?.networkScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Signal</span>
              {conn === 'wifi' && n?.wifiSignalPercent != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <SignalBars percent={n.wifiSignalPercent} />
                  <span className="stat-value text-blue">{n.wifiSignalPercent.toFixed(0)}%</span>
                </div>
              ) : (
                <span className="stat-value text-muted">{conn === 'ethernet' ? 'Wired' : 'N/A'}</span>
              )}
            </div>
            <div className="stat-item">
              <span className="stat-label">Band</span>
              <span className="stat-value">{conn === 'wifi' ? (n?.wifiBand ?? 'N/A') : '—'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Download</span>
              <span className="stat-value text-green">
                <ArrowDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}{n?.downloadSpeed != null ? formatBytes(n.downloadSpeed) + '/s' : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Upload</span>
              <span className="stat-value text-purple">
                <ArrowUp size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                {' '}{n?.uploadSpeed != null ? formatBytes(n.uploadSpeed) + '/s' : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Ping</span>
              <span className={`stat-value ${n?.pingMs && n.pingMs > 100 ? 'text-amber' : 'text-green'}`}>
                {n?.pingMs != null ? `${n.pingMs} ms` : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Status</span>
              <span className={`stat-value ${conn !== 'offline' ? 'text-green' : 'text-red'}`}>
                {conn === 'wifi' ? 'Wi-Fi' : conn === 'ethernet' ? 'Ethernet' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
