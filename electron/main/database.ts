import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'

// Pure-JS JSON file database — no native compilation required
// Replaces better-sqlite3 for cross-platform compatibility

interface HealthSnapshot {
  id: number
  timestamp: string
  overall_score: number
  battery_score: number
  thermal_score: number
  disk_score: number
  cpuram_score: number
  network_score: number
  battery_health_percent: number
  battery_level: number
  cpu_temp: number
  disk_health: string
  ram_used_percent: number
}

interface DbSchema {
  snapshots: HealthSnapshot[]
  nextId: number
}

let dbPath: string
let cache: DbSchema | null = null

function getDb(): DbSchema {
  if (cache) return cache
  if (existsSync(dbPath)) {
    try {
      cache = JSON.parse(readFileSync(dbPath, 'utf8')) as DbSchema
    } catch {
      cache = { snapshots: [], nextId: 1 }
    }
  } else {
    cache = { snapshots: [], nextId: 1 }
  }
  return cache
}

function saveDb(): void {
  if (!cache || !dbPath) return
  // Keep only last 1000 snapshots to prevent file bloat
  if (cache.snapshots.length > 1000) {
    cache.snapshots = cache.snapshots.slice(-1000)
  }
  writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf8')
}

export function initDatabase(): void {
  const dbDir = join(app.getPath('userData'), 'lapcharm')
  mkdirSync(dbDir, { recursive: true })
  dbPath = join(dbDir, 'health.json')
  // Pre-load cache
  getDb()
  console.log(`[LapCharm DB] Initialized at ${dbPath}`)
}

export function saveSnapshot(score: {
  overall: number
  battery: number
  thermal: number
  disk: number
  cpuram: number
  network: number
  batteryHealthPercent?: number
  batteryLevel?: number
  cpuTemp?: number
  diskHealth?: string
  ramUsedPercent?: number
}): void {
  const db = getDb()
  const snapshot: HealthSnapshot = {
    id: db.nextId++,
    timestamp: new Date().toISOString(),
    overall_score: score.overall,
    battery_score: score.battery,
    thermal_score: score.thermal,
    disk_score: score.disk,
    cpuram_score: score.cpuram,
    network_score: score.network,
    battery_health_percent: score.batteryHealthPercent ?? 0,
    battery_level: score.batteryLevel ?? 0,
    cpu_temp: score.cpuTemp ?? 0,
    disk_health: score.diskHealth ?? 'Unknown',
    ram_used_percent: score.ramUsedPercent ?? 0
  }
  db.snapshots.push(snapshot)
  saveDb()
}

export function getHistoryData(days: number): HealthSnapshot[] {
  const db = getDb()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return db.snapshots.filter((s) => new Date(s.timestamp) >= cutoff)
}
