import si from 'systeminformation'
import { execPowerShell } from './powershell'

export interface BatteryInfo {
  hasBattery: boolean
  isCharging: boolean
  acConnected: boolean
  percent: number
  timeRemaining: number | null
  designCapacity: number
  fullChargeCapacity: number
  healthPercent: number
  voltage: number
  chargingWatts: number
  cycleCount: number
  manufacturer: string
  model: string
  temperature: number | null
  healthScore: number
}

export async function getBatteryInfo(): Promise<BatteryInfo> {
  // systeminformation is the primary source — always works
  const siBattery = await si.battery()

  // Defaults from systeminformation
  let designCapacity     = siBattery.designedCapacity  ?? 0
  let fullChargeCapacity = siBattery.maxCapacity        ?? 0
  let cycleCount         = siBattery.cycleCount         ?? 0
  let voltage            = siBattery.voltage            ?? 0
  let chargingWatts      = 0

  // Try WMI for extra precision — cached 15s so it's cheap
  try {
    const psResult = await execPowerShell(`
$s = Get-WmiObject -Namespace root\\WMI -Class BatteryStaticData -EA SilentlyContinue | Select-Object -First 1
$f = Get-WmiObject -Namespace root\\WMI -Class BatteryFullChargedCapacity -EA SilentlyContinue | Select-Object -First 1
$st = Get-WmiObject -Namespace root\\WMI -Class BatteryStatus -EA SilentlyContinue | Select-Object -First 1
$c = Get-WmiObject -Namespace root\\WMI -Class BatteryCycleCount -EA SilentlyContinue | Select-Object -First 1
[PSCustomObject]@{
  DesignCapacity     = if($s)  { $s.DesignedCapacity  } else { 0 }
  FullChargeCapacity = if($f)  { $f.FullChargedCapacity } else { 0 }
  CycleCount         = if($c)  { $c.CycleCount          } else { 0 }
  Voltage            = if($st) { $st.Voltage             } else { 0 }
  ChargeRate         = if($st) { $st.ChargeRate          } else { 0 }
  DischargeRate      = if($st) { $st.DischargeRate       } else { 0 }
} | ConvertTo-Json`, 15000)

    if (psResult) {
      const p = JSON.parse(psResult)
      if (p.DesignCapacity     > 0) designCapacity     = p.DesignCapacity
      if (p.FullChargeCapacity > 0) fullChargeCapacity = p.FullChargeCapacity
      if (p.CycleCount         > 0) cycleCount         = p.CycleCount
      if (p.Voltage            > 0) voltage            = p.Voltage / 1000  // mV → V
      const rate = siBattery.ischarging ? (p.ChargeRate ?? 0) : (p.DischargeRate ?? 0)
      if (rate > 0) chargingWatts = rate / 1000  // mW → W
    }
  } catch {
    // PS failed — use systeminformation fallback (still good data)
  }

  // Fallback chargingWatts from voltage if still 0
  if (chargingWatts === 0 && voltage > 0) {
    // Estimate: laptop chargers typically draw 1.5–3A
    chargingWatts = siBattery.ischarging ? voltage * 2.0 : voltage * 0.8
  }

  // Ensure we always have sensible capacity values
  if (designCapacity === 0) designCapacity = fullChargeCapacity > 0 ? Math.round(fullChargeCapacity * 1.2) : 1
  if (fullChargeCapacity === 0) fullChargeCapacity = designCapacity

  const healthPercent = Math.min(100, (fullChargeCapacity / designCapacity) * 100)

  // Health score mapping
  const healthScore =
    healthPercent >= 80 ? Math.round(75 + (healthPercent - 80) * 1.25) :
    healthPercent >= 60 ? Math.round(50 + (healthPercent - 60))        :
    healthPercent >= 40 ? Math.round(25 + (healthPercent - 40) * 1.25) :
    Math.round(healthPercent * 0.625)

  return {
    hasBattery:          siBattery.hasbattery,
    isCharging:          siBattery.ischarging,
    acConnected:         siBattery.acconnected,
    percent:             siBattery.percent ?? 0,
    timeRemaining:       siBattery.timeremaining ?? null,
    designCapacity,
    fullChargeCapacity,
    healthPercent:       Math.round(healthPercent * 10) / 10,
    voltage:             Math.round(voltage * 100) / 100,
    chargingWatts:       Math.round(chargingWatts * 10) / 10,
    cycleCount,
    manufacturer:        siBattery.manufacturer || 'Unknown',
    model:               siBattery.model        || 'Unknown',
    temperature:         null,
    healthScore:         Math.max(0, Math.min(100, healthScore))
  }
}
