import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface NetworkInfo {
  wifiConnected: boolean
  wifiSsid: string
  wifiSignalDb: number
  wifiSignalPercent: number
  wifiBand: '2.4GHz' | '5GHz' | '6GHz' | 'Unknown'
  wifiChannel: number
  wifiSecurity: string
  downloadSpeed: number
  uploadSpeed: number
  pingMs: number | null
  adapters: { name: string; type: string; speed: number; isConnected: boolean; ipv4: string; mac: string }[]
  networkScore: number
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  // Primary: systeminformation — fast, no PS needed
  const [siNet, siNetStats, siWifi] = await Promise.all([
    si.networkInterfaces(),
    si.networkStats(),
    si.wifiNetworks()
  ])

  const wifi = siWifi.find((w) => w.ssid) ?? siWifi[0]

  // Ping: cached 12s so it only runs once per cache window
  let pingMs: number | null = null
  try {
    const pingResult = await execPowerShell(
      `(Test-Connection -ComputerName 8.8.8.8 -Count 1 -EA SilentlyContinue).ResponseTime`,
      12000
    )
    const val = parseInt(pingResult.trim())
    if (!isNaN(val) && val >= 0) pingMs = val
  } catch { /* optional */ }

  const activeStats = siNetStats.find((s) => (s.rx_sec ?? 0) + (s.tx_sec ?? 0) > 0) ?? siNetStats[0]
  const adapters = (Array.isArray(siNet) ? siNet : [siNet]).map((a: any) => ({
    name: a.iface ?? 'Unknown',
    type: a.type  ?? 'Unknown',
    speed: a.speed ?? 0,
    isConnected: a.operstate === 'up',
    ipv4: a.ip4 ?? '',
    mac:  a.mac ?? ''
  }))

  const wifiSignalDb      = wifi?.signalLevel ?? -90
  const wifiSignalPercent = Math.max(0, Math.min(100, 2 * (wifiSignalDb + 100)))

  let wifiBand: NetworkInfo['wifiBand'] = 'Unknown'
  if (wifi?.frequency) {
    if      (wifi.frequency >= 6000) wifiBand = '6GHz'
    else if (wifi.frequency >= 5000) wifiBand = '5GHz'
    else if (wifi.frequency >= 2400) wifiBand = '2.4GHz'
  }

  let networkScore = 100
  if (!wifi?.ssid) {
    networkScore = 50
  } else {
    if (wifiSignalPercent < 40) networkScore -= 30
    else if (wifiSignalPercent < 60) networkScore -= 15
    if (pingMs !== null && pingMs > 100) networkScore -= 20
    else if (pingMs !== null && pingMs > 50) networkScore -= 10
  }

  return {
    wifiConnected:    !!(wifi?.ssid),
    wifiSsid:         wifi?.ssid     ?? '',
    wifiSignalDb,
    wifiSignalPercent,
    wifiBand,
    wifiChannel:      wifi?.channel  ?? 0,
    wifiSecurity:     wifi?.security ?? 'Unknown',
    downloadSpeed:    activeStats?.rx_sec ?? 0,
    uploadSpeed:      activeStats?.tx_sec ?? 0,
    pingMs,
    adapters,
    networkScore:     Math.max(0, networkScore)
  }
}
