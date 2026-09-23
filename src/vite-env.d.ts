/// <reference types="vite/client" />

declare module '*.png' {
  const src: string
  export default src
}

type LapCharmResult<T> = { success: true; data: T } | { success: false; error: string }

interface LapCharmAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  app: {
    getVersion: () => Promise<string>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
  }
  battery: {
    get: () => Promise<LapCharmResult<import('./store/health.store').BatteryState>>
  }
  thermal: {
    get: () => Promise<LapCharmResult<import('./store/health.store').ThermalState>>
  }
  disk: {
    get: () => Promise<LapCharmResult<import('./store/health.store').DiskState>>
  }
  cpuram: {
    get: () => Promise<LapCharmResult<import('./store/health.store').CpuRamState>>
  }
  audio: {
    get: () => Promise<LapCharmResult<import('./store/health.store').AudioState>>
  }
  network: {
    get: () => Promise<LapCharmResult<import('./store/health.store').NetworkState>>
  }
  display: {
    get: () => Promise<LapCharmResult<unknown>>
  }
  health: {
    score: () => Promise<LapCharmResult<import('./store/health.store').HealthScoreState>>
  }
  history: {
    get: (days?: number) => Promise<LapCharmResult<unknown[]>>
  }
}

interface Window {
  lapcharm: LapCharmAPI
}
