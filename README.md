# LapCharm

[![Version](https://img.shields.io/badge/version-3.0.0-2dd4a8)](https://github.com/mahimapaseda/LapCharm/releases/tag/v3.0.0)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-22d3a5)](https://github.com/mahimapaseda/LapCharm/releases)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**Premium real-time laptop health monitoring** — battery, thermals, disk, CPU, RAM, audio, network, and display diagnostics in a clean desktop app.

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="LapCharm Dashboard" width="900" />
</p>

## Features

- **Overall health score** with letter grade and actionable recommendations
- **Seven diagnostic modules** — Battery, Thermal, Storage, CPU & RAM, Audio, Network, Display
- **History & export** — JSON, CSV, and PDF reports from saved snapshots
- **System tray** and dark / light themes
- **Windows-native** data via `systeminformation` and PowerShell/WMI

## Screenshots

| Battery | Thermal |
|:---:|:---:|
| ![Battery](docs/screenshots/battery.png) | ![Thermal](docs/screenshots/thermal.png) |

| Storage | CPU & RAM |
|:---:|:---:|
| ![Storage](docs/screenshots/disk.png) | ![CPU & RAM](docs/screenshots/cpuram.png) |

<p align="center">
  <img src="docs/screenshots/reports.png" alt="LapCharm Reports" width="900" />
  <br />
  <em>History snapshots and JSON / CSV / PDF export</em>
</p>

> Illustrative mock UI screenshots for documentation — not live captures.

## Install

1. Open the [v3.0.0 release](https://github.com/mahimapaseda/LapCharm/releases/tag/v3.0.0)
2. Download **LapCharm Setup 3.0.0.exe**
3. Run the NSIS installer (Windows x64)

## Development

```bash
npm install
npm run dev        # Electron + Vite hot reload
npm run build      # Compile main / preload / renderer
npm run package    # Windows NSIS installer → release/
```

Requires Node.js 18+ and Windows for full hardware collectors.

## Architecture

```mermaid
flowchart LR
  subgraph mainProc [Main]
    Collectors[Collectors]
    Cache[TTL Cache]
    DB[JSON Snapshots]
  end
  subgraph preloadBridge [Preload]
    Bridge["window.lapcharm"]
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

MIT © LapCharm Team
