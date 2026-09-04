import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface ThermalInfo {
  cpuTemp: number | null
  cpuTempPerCore: number[]
  gpuTemp: number | null
  maxTemp: number | null
  fanSpeeds: number[]
  isThrottling: boolean
  thermalScore: number
  sensorAvailable: boolean
  zones: { name: string; temp: number }[]
}

function scoreFromTemp(maxTemp: number): number {
  if (maxTemp <= 60) return 100
  if (maxTemp <= 70) return Math.round(100 - (maxTemp - 60) * 3)
  if (maxTemp <= 80) return Math.round(70 - (maxTemp - 70) * 4)
  if (maxTemp <= 90) return Math.round(30 - (maxTemp - 80) * 2)
  return Math.max(0, Math.round(10 - (maxTemp - 90) * 2))
}

async function readWindowsThermalZones(): Promise<{ name: string; temp: number }[]> {
  const ps = await execPowerShell(`
$out = @()
try {
  $samples = (Get-Counter '\\Thermal Zone Information(*)\\Temperature' -EA Stop).CounterSamples
  foreach ($s in $samples) {
    $c = [math]::Round($s.CookedValue - 273.15, 1)
    if ($c -gt 0 -and $c -lt 125) {
      $out += [PSCustomObject]@{ name = $s.InstanceName; temp = $c }
    }
  }
} catch {}
$out | ConvertTo-Json -Compress
`, 20000)

  if (!ps || ps === 'null') return []
  try {
    const parsed = JSON.parse(ps)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return list
      .filter((z: any) => typeof z?.temp === 'number' && z.temp > 0)
      .map((z: any) => ({ name: String(z.name || 'Zone'), temp: z.temp }))
  } catch {
    return []
  }
}

async function readGpuTemps(): Promise<number | null> {
  try {
    const gfx = await si.graphics()
    const fromSi = gfx.controllers
      .map((c) => c.temperatureGpu)
      .filter((t): t is number => typeof t === 'number' && t > 0 && t < 125)
    if (fromSi.length > 0) return Math.max(...fromSi)
  } catch { /* optional */ }

  try {
    const nvsmi = await execPowerShell(
      `(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader 2>$null | Select-Object -First 1).Trim()`,
      15000
    )
    const val = parseFloat(nvsmi)
    if (!isNaN(val) && val > 0 && val < 125) return val
  } catch { /* optional */ }

  return null
}

async function readFanSpeeds(): Promise<number[]> {
  try {
    const ps = await execPowerShell(`
$fanList = @()
$fans = Get-CimInstance Win32_Fan -EA SilentlyContinue
if ($fans) {
  foreach ($f in @($fans)) {
    if ($f.DesiredSpeed -and $f.DesiredSpeed -gt 0) { $fanList += [int]$f.DesiredSpeed }
  }
}
$fanList | ConvertTo-Json -Compress
`, 15000)
    if (!ps || ps === 'null') return []
    const parsed = JSON.parse(ps)
    return (Array.isArray(parsed) ? parsed : [parsed]).filter((n) => typeof n === 'number' && n > 0)
  } catch {
    return []
  }
}

export async function getThermalInfo(): Promise<ThermalInfo> {
  const [siTemp, siCpu, gpuTemp, zones, fanSpeeds] = await Promise.all([
    si.cpuTemperature(),
    si.cpu(),
    readGpuTemps(),
    readWindowsThermalZones(),
    readFanSpeeds()
  ])

  let cpuTemp: number | null =
    typeof siTemp.main === 'number' && siTemp.main > 0 ? siTemp.main : null

  let cpuTempPerCore: number[] =
    siTemp.cores && siTemp.cores.length > 0
      ? siTemp.cores.filter((t) => typeof t === 'number' && t > 0).map((t) => Math.round(t * 10) / 10)
      : []

  // Windows: systeminformation often returns null — use thermal zone counters
  if (cpuTemp == null && zones.length > 0) {
    const zoneTemps = zones.map((z) => z.temp)
    cpuTemp = Math.max(...zoneTemps)
  }

  // Don't invent fake per-core rows of 0°C
  if (cpuTempPerCore.length === 0 && cpuTemp != null && (siCpu.physicalCores || 0) > 0) {
    // Single package reading — show one row, not N zeros
    cpuTempPerCore = []
  }

  const candidates = [
    cpuTemp,
    gpuTemp,
    ...cpuTempPerCore,
    ...zones.map((z) => z.temp)
  ].filter((t): t is number => typeof t === 'number' && t > 0)

  const maxTemp = candidates.length > 0 ? Math.max(...candidates) : null
  const sensorAvailable = maxTemp != null
  const isThrottling = maxTemp != null && maxTemp > 90
  const thermalScore = sensorAvailable ? scoreFromTemp(maxTemp!) : 70

  return {
    cpuTemp: cpuTemp != null ? Math.round(cpuTemp * 10) / 10 : null,
    cpuTempPerCore,
    gpuTemp: gpuTemp != null ? Math.round(gpuTemp * 10) / 10 : null,
    maxTemp: maxTemp != null ? Math.round(maxTemp * 10) / 10 : null,
    fanSpeeds,
    isThrottling,
    thermalScore: Math.max(0, Math.min(100, thermalScore)),
    sensorAvailable,
    zones
  }
}
