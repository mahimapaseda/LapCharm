import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Volume2, Mic, Speaker, Bluetooth } from 'lucide-react'
import './ModulePage.css'

const lc = window.lapcharm

const TYPE_ICONS: Record<string, React.ElementType> = {
  Speaker:    Volume2,
  Microphone: Mic,
  Headphone:  Volume2,
  Bluetooth:  Bluetooth,
  'USB Audio': Volume2,
  Other:      Volume2
}

export default function Audio() {
  const { audio, setAudio } = useHealthStore()

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.audio?.get()
      if (res?.success) setAudio(res.data)
    }
    fetch()
    const id = setInterval(fetch, 60000)
    return () => clearInterval(id)
  }, [])

  const a = audio

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(167,139,250,0.1)' }}>
          <Volume2 size={24} color="var(--color-accent-purple)" />
        </div>
        <div>
          <h1 className="module-title">Audio Health</h1>
          <p className="module-subtitle">Sound devices & driver status</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={a?.audioScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total Devices</span>
              <span className="stat-value">{a?.devices?.length ?? 'N/A'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active</span>
              <span className="stat-value text-green">
                {a?.devices?.filter(d => d.status === 'active').length ?? 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {a?.devices && a.devices.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Audio Devices</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Device</th>
                <th>Type</th>
                <th>Manufacturer</th>
                <th>Status</th>
                <th>Default</th>
              </tr>
            </thead>
            <tbody>
              {a.devices.map((dev, i) => {
                const Icon = TYPE_ICONS[dev.type] ?? Volume2
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} />
                        {dev.name}
                      </span>
                    </td>
                    <td>{dev.type}</td>
                    <td>{dev.manufacturer}</td>
                    <td>
                      <span className={`badge ${dev.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                        {dev.status}
                      </span>
                    </td>
                    <td>
                      {dev.isDefault && <span className="badge badge-blue">Default</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
