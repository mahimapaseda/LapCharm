import type { IpcMain } from 'electron'
import { getBatteryInfo } from './collectors/battery'
import { getThermalInfo } from './collectors/thermal'
import { getDiskInfo } from './collectors/disk'
import { getCpuRamInfo } from './collectors/cpu-ram'
import { getAudioInfo } from './collectors/audio'
import { getNetworkInfo } from './collectors/network'
import { getDisplayInfo } from './collectors/display'
import { getOverallHealthScore } from './collectors/health-score'
import { getHistoryData, saveSnapshot } from './database'
import { getCached, setCached } from './data-cache'

// ============================================================
// TTL config (milliseconds) — how long each module result
// is reused before hitting system APIs again
// ============================================================
const TTL = {
  battery:  10_000,   // 10s  — charge level changes slowly
  thermal:   8_000,   //  8s  — temps can spike, but 8s is fine
  disk:     30_000,   // 30s  — disk health is nearly static
  cpuram:    6_000,   //  6s  — usage changes somewhat fast
  audio:    60_000,   // 60s  — audio devices rarely change
  network:  12_000,   // 12s  — signal changes gradually
  display:  60_000,   // 60s  — display config is static
  score:    12_000,   // 12s  — composite, refresh with battery
}

async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key, ttl)
  if (hit !== null) return hit
  const data = await fn()
  setCached(key, data)
  return data
}

export function registerIpcHandlers(ipcMain: IpcMain): void {

  ipcMain.handle('battery:get', async () => {
    try {
      const data = await cached('battery', TTL.battery, getBatteryInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('thermal:get', async () => {
    try {
      const data = await cached('thermal', TTL.thermal, getThermalInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('disk:get', async () => {
    try {
      const data = await cached('disk', TTL.disk, getDiskInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('cpuram:get', async () => {
    try {
      const data = await cached('cpuram', TTL.cpuram, getCpuRamInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('audio:get', async () => {
    try {
      const data = await cached('audio', TTL.audio, getAudioInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('network:get', async () => {
    try {
      const data = await cached('network', TTL.network, getNetworkInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('display:get', async () => {
    try {
      const data = await cached('display', TTL.display, getDisplayInfo)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('health:score', async () => {
    try {
      const data = await cached('score', TTL.score, async () => {
        const [battery, thermal, disk, cpuram, network] = await Promise.all([
          cached('battery', TTL.battery, getBatteryInfo),
          cached('thermal', TTL.thermal, getThermalInfo),
          cached('disk',    TTL.disk,    getDiskInfo),
          cached('cpuram',  TTL.cpuram,  getCpuRamInfo),
          cached('network', TTL.network, getNetworkInfo)
        ])
        return getOverallHealthScore({ battery, thermal, disk, cpuram, network })
      })
      saveSnapshot(data)
      return { success: true, data }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })

  ipcMain.handle('history:get', (_event, days: number = 7) => {
    try {
      return { success: true, data: getHistoryData(days) }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  })
}
