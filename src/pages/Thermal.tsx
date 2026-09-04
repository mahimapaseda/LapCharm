import { useEffect } from 'react'
import { useHealthStore } from '../store/health.store'
import ScoreRing from '../components/shared/ScoreRing'
import { Thermometer, Wind, AlertTriangle } from 'lucide-react'
import './ModulePage.css'

const lc = (window as any).lapcharm

function getTempColor(temp: number): string {
  if (temp <= 60) return 'var(--color-accent-green)'
  if (temp <= 75) return 'var(--color-accent-blue)'
  if (temp <= 85) return 'var(--color-accent-amber)'
  return 'var(--color-accent-red)'
}

export default function Thermal() {
  const { thermal, setThermal } = useHealthStore()

  useEffect(() => {
    const fetch = async () => {
      const res = await lc?.thermal?.get()
      if (res?.success) setThermal(res.data)
    }
    fetch()
    const id = setInterval(fetch, 15000)
    return () => clearInterval(id)
  }, [])

  const t = thermal

  return (
    <div className="module-page">
      <div className="module-header">
        <div className="module-header-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
          <Thermometer size={24} color="var(--color-accent-amber)" />
        </div>
        <div>
          <h1 className="module-title">Thermal Monitor</h1>
          <p className="module-subtitle">Real-time CPU & GPU temperatures</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="card stat-card">
          <ScoreRing score={t?.thermalScore ?? 0} size={100} strokeWidth={8} label="Score" />
        </div>
        <div className="card stat-card flex-1">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">CPU Temp</span>
              <span className="stat-value" style={{ color: getTempColor(t?.cpuTemp ?? 0) }}>
                {t?.cpuTemp?.toFixed(1) ?? 'N/A'}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">GPU Temp</span>
              <span className="stat-value" style={{ color: getTempColor(t?.gpuTemp ?? 0) }}>
                {t?.gpuTemp != null ? `${t.gpuTemp.toFixed(1)}°C` : 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Temp</span>
              <span className="stat-value" style={{ color: getTempColor(t?.maxTemp ?? 0) }}>
                {t?.maxTemp?.toFixed(1) ?? 'N/A'}°C
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Throttling</span>
              <span className={`stat-value ${t?.isThrottling ? 'text-red' : 'text-green'}`}>
                {t?.isThrottling ? '⚠ Yes' : '✓ No'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-core temperatures */}
      {t && t.cpuTempPerCore.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Per-Core Temperatures</h2>
          <div className="core-grid">
            {t.cpuTempPerCore.map((temp, i) => (
              <div key={i} className="core-item">
                <span className="core-label">Core {i}</span>
                <div className="core-bar-track">
                  <div
                    className="core-bar-fill"
                    style={{
                      width: `${Math.min(100, (temp / 100) * 100)}%`,
                      background: getTempColor(temp)
                    }}
                  />
                </div>
                <span className="core-temp" style={{ color: getTempColor(temp) }}>
                  {temp.toFixed(0)}°C
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fan speeds */}
      {t && t.fanSpeeds.length > 0 && (
        <div className="card">
          <h2 className="card-section-title">Fan Speeds</h2>
          <div className="core-grid">
            {t.fanSpeeds.map((rpm, i) => (
              <div key={i} className="core-item">
                <Wind size={14} color="var(--color-accent-blue)" />
                <span className="core-label">Fan {i + 1}</span>
                <span className="core-temp text-blue">{rpm > 0 ? `${rpm} RPM` : 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Throttle warning */}
      {t?.isThrottling && (
        <div className="card warning-card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <AlertTriangle size={18} color="var(--color-accent-red)" />
          <div>
            <p className="warning-title" style={{ color: 'var(--color-accent-red)' }}>Thermal Throttling Detected</p>
            <p className="warning-desc">
              CPU performance is being limited to prevent overheating. Clean the cooling vents and check thermal paste. Consider a cooling pad.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
