import type { BatteryInfo } from './battery'
import type { ThermalInfo } from './thermal'
import type { DiskInfo } from './disk'
import type { CpuRamInfo } from './cpu-ram'
import type { NetworkInfo } from './network'

interface AllModuleData {
  battery: BatteryInfo
  thermal: ThermalInfo
  disk: DiskInfo
  cpuram: CpuRamInfo
  network: NetworkInfo
}

export interface OverallHealthScore {
  overall: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  battery: number
  thermal: number
  disk: number
  cpuram: number
  network: number
  audio: number
  recommendations: string[]
  // Snapshot extras
  batteryHealthPercent: number
  batteryLevel: number
  cpuTemp: number
  diskHealth: string
  ramUsedPercent: number
}

export function getOverallHealthScore(data: AllModuleData): OverallHealthScore {
  const { battery, thermal, disk, cpuram, network } = data

  // Weighted scores
  const weights = {
    battery: 0.25,
    thermal: 0.20,
    disk: 0.25,
    cpuram: 0.15,
    network: 0.10,
    audio: 0.05
  }

  const audioScore = 90 // Default, updated when audio module runs

  const overall = Math.round(
    battery.healthScore * weights.battery +
    thermal.thermalScore * weights.thermal +
    disk.overallDiskScore * weights.disk +
    cpuram.overallScore * weights.cpuram +
    network.networkScore * weights.network +
    audioScore * weights.audio
  )

  const grade: OverallHealthScore['grade'] =
    overall >= 85 ? 'A' :
    overall >= 70 ? 'B' :
    overall >= 55 ? 'C' :
    overall >= 40 ? 'D' : 'F'

  // Generate recommendations
  const recommendations: string[] = []

  if (battery.healthPercent < 40) {
    recommendations.push('🔋 Battery health is critically low. Consider replacing the battery soon.')
  } else if (battery.healthPercent < 60) {
    recommendations.push('🔋 Battery health is declining. Monitor closely and plan for replacement.')
  }

  if (thermal.maxTemp > 90) {
    recommendations.push('🌡️ CPU temperature is dangerously high. Clean the cooling vents and check thermal paste.')
  } else if (thermal.maxTemp > 80) {
    recommendations.push('🌡️ CPU is running hot. Ensure good airflow and consider a cooling pad.')
  }

  if (thermal.isThrottling) {
    recommendations.push('⚡ CPU thermal throttling detected. Performance is being limited to prevent overheating.')
  }

  disk.drives.forEach((d) => {
    if (d.healthStatus === 'Bad') {
      recommendations.push(`💾 Disk "${d.name}" is failing. Back up your data immediately!`)
    } else if (d.healthStatus === 'Caution') {
      recommendations.push(`💾 Disk "${d.name}" shows caution indicators. Run a full backup.`)
    }
  })

  disk.partitions.forEach((p) => {
    if (p.usedPercent > 90) {
      recommendations.push(`💾 Partition "${p.mount}" is ${p.usedPercent}% full. Free up space to maintain performance.`)
    }
  })

  if (cpuram.usedPercent > 85) {
    recommendations.push('🧠 RAM usage is very high. Close unused applications or consider upgrading RAM.')
  }

  if (network.wifiSignalPercent < 40) {
    recommendations.push('📶 Wi-Fi signal is weak. Move closer to the router or use a 5GHz band.')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Your laptop is in excellent health. Keep it up!')
  }

  return {
    overall,
    grade,
    battery: battery.healthScore,
    thermal: thermal.thermalScore,
    disk: disk.overallDiskScore,
    cpuram: cpuram.overallScore,
    network: network.networkScore,
    audio: audioScore,
    recommendations,
    batteryHealthPercent: battery.healthPercent,
    batteryLevel: battery.percent,
    cpuTemp: thermal.cpuTemp,
    diskHealth: disk.drives[0]?.healthStatus || 'Unknown',
    ramUsedPercent: cpuram.usedPercent
  }
}
