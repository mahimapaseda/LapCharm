<p align="center">
  <img src="docs/branding/logo.png" alt="SystemLens logo" width="96" />
</p>

# SystemLens

[![Version](https://img.shields.io/badge/version-4.0.0-2dd4a8)](https://github.com/mahimapaseda/LapCharm/releases/tag/v4.0.0)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-22d3a5)](https://github.com/mahimapaseda/LapCharm/releases)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Premium real-time laptop health monitoring** — battery, thermals, disk, CPU, RAM, audio, network, and display diagnostics in a clean desktop app.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="SystemLens Dashboard" width="900" />
</p>

## Features

- **Overall health score** with letter grade and actionable recommendations
- **Seven diagnostic modules** — Battery, Thermal, Storage, CPU & RAM, Audio, Network, Display
- **History & export** — JSON, CSV, and PDF reports from saved snapshots
- **System tray shortcut** while the app is open, plus dark / light themes
- **Windows-native** data via `systeminformation` and PowerShell/WMI

## Screenshots

| Battery | Thermal |
|:---:|:---:|
| ![Battery](docs/screenshots/battery.png) | ![Thermal](docs/screenshots/thermal.png) |

| Storage | CPU & RAM |
|:---:|:---:|
| ![Storage](docs/screenshots/disk.png) | ![CPU & RAM](docs/screenshots/cpuram.png) |

<p align="center">
  <img src="docs/screenshots/reports.png" alt="SystemLens Reports" width="900" />
  <br />
  <em>History snapshots and JSON / CSV / PDF export</em>
</p>

> Illustrative mock UI screenshots for documentation — not live captures.

## Install

1. Open the [v4.0.0 release](https://github.com/mahimapaseda/LapCharm/releases/tag/v4.0.0)
2. Download **SystemLens Setup 4.0.0.exe**
3. Run the NSIS installer (Windows x64)

Closing the window fully exits SystemLens.

## Development

```bash
npm install
npm run dev        # Electron + Vite hot reload
npm run build      # Compile main / preload / renderer
npm run package    # Windows NSIS installer → release/
```

Requires Node.js 18+ and Windows for full hardware collectors.

Packaging expects brand assets at `assets/icons/icon.png`, `assets/icons/icon.ico`,
`assets/icons/tray.png`, and `src/assets/logo.png`. Ensure those files exist before
`npm run package`.

## Architecture

```mermaid
flowchart LR
  subgraph mainProc [Main]
    Collectors[Collectors]
    Cache[TTL Cache]
    DB[JSON Snapshots]
  end
  subgraph preloadBridge [Preload]
    Bridge["window.systemlens"]
  end
  subgraph rendererUI [Renderer]
    Pages[React Pages]
    Store[Zustand Store]
  end
  Collectors --> Cache
  Cache --> Bridge
  Bridge --> Pages
  Pages --> Store
  Cache --> DB
```

| Layer | Path | Role |
|-------|------|------|
| Main | `electron/main/` | Window, tray, IPC, collectors, history DB |
| Preload | `electron/preload/` | Secure `contextBridge` API |
| Renderer | `src/` | React UI, Zustand, Recharts |

## License

MIT © SystemLens Team
