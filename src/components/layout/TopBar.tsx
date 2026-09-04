import { Minus, Square, X, Activity, Sun, Moon } from 'lucide-react'
import type { Page } from '../../App'
import './TopBar.css'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  battery:   'Battery Health',
  thermal:   'Thermal Monitor',
  disk:      'Disk Health',
  cpuram:    'CPU & RAM',
  audio:     'Audio Health',
  network:   'Network',
  display:   'Display',
  reports:   'Reports'
}

interface Props {
  activePage: Page
  theme: 'dark' | 'light'
  toggleTheme: () => void
}

export default function TopBar({ activePage, theme, toggleTheme }: Props) {
  const win = (window as any).lapcharm?.window

  return (
    <header className="topbar" data-drag-region>
      <div className="topbar-left">
        <div className="topbar-logo">
          <div className="logo-mark">
            <Activity size={15} strokeWidth={2.5} className="logo-icon" />
          </div>
          <span className="logo-text">LapCharm</span>
        </div>
        <div className="topbar-divider" />
        <span className="topbar-page-title">{PAGE_TITLES[activePage]}</span>
      </div>

      <div className="topbar-right">
        <div className="live-indicator">
          <span className="live-dot" />
          <span className="live-label">Live</span>
        </div>

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <div className="window-controls">
          <button
            id="btn-minimize"
            className="wc-btn wc-minimize"
            onClick={() => win?.minimize()}
            title="Minimize"
          >
            <Minus size={12} />
          </button>
          <button
            id="btn-maximize"
            className="wc-btn wc-maximize"
            onClick={() => win?.maximize()}
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            id="btn-close"
            className="wc-btn wc-close"
            onClick={() => win?.close()}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </header>
  )
}
