import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface ThermalInfo {
  cpuTemp: number
  cpuTempPerCore: number[]
  gpuTemp: number | null
  maxTemp: number
  fanSpeeds: number[]
  isThrottling: boolean
  thermalScore: number
  zones: { name: string; temp: number }[]
}

export async function getThermalInfo(): Promise<ThermalInfo> {
  // Primary: systeminformation (no PS needed)
  const [siTemp, siCpu] = await Promise.all([
    si.cpuTemperature(),
    si.cpu()
  ])

  const cpuTemp       = siTemp.main   ?? 0
  const gpuTemp       = siTemp.gpu    ?? null
  const cpuTempPerCore: number[] =
    siTemp.cores && siTemp.cores.length > 0
      ? siTemp.cores.map((t) => Math.round(t * 10) / 10)
      : Array(siCpu.physicalCores || 4).fill(cpuTemp)

  let fanSpeeds: number[] = []
  let zones: { name: string; temp: number }[] = []

  // Optional WMI enhancement — cached 15s
  try {
    const ps = await execPowerShell(`
$fans = Get-WmiObject Win32_Fan -EA SilentlyContinue
$fanList = @()
if ($fans) { foreach ($f in $fans) { if ($f.DesiredSpeed) { $fanList += $f.DesiredSpeed } } }
$fanList | ConvertTo-Json`, 15000)

    if (ps && ps.trim() !== 'null' && ps.trim() !== '') {
      const parsed = JSON.parse(ps)
      fanSpeeds = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean)
    }
  } catch { /* PS optional */ }

  const maxTemp = Math.max(cpuTemp, gpuTemp ?? 0, ...cpuTempPerCore)

  // Throttling: if maxTemp > 90°C, flag as throttling
  const isThrottling = maxTemp > 90

  const thermalScore =
    maxTemp === 0 ? 85 :          // no sensor = assume ok
    maxTemp <= 60  ? 100 :
    maxTemp <= 70  ? Math.round(100 - (maxTemp - 60) * 3) :
    maxTemp <= 80  ? Math.round(70  - (maxTemp - 70) * 4) :
    maxTemp <= 90  ? Math.round(30  - (maxTemp - 80) * 2) :
    Math.max(0, Math.round(10 - (maxTemp - 90) * 2))

  return {
    cpuTemp:        Math.round(cpuTemp * 10) / 10,
    cpuTempPerCore,
    gpuTemp:        gpuTemp !== null ? Math.round(gpuTemp * 10) / 10 : null,
    maxTemp:        Math.round(maxTemp * 10) / 10,
    fanSpeeds,
    isThrottling,
    thermalScore:   Math.max(0, Math.min(100, thermalScore)),
    zones
  }
}
