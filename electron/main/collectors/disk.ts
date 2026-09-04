import si from 'systeminformation'

export interface DiskDriveInfo {
  name: string
  type: string
  size: number
  temperature: number | null
  healthStatus: 'Good' | 'Caution' | 'Bad' | 'Unknown'
  healthPercent: number | null
  smartPassed: boolean | null
  reallocatedSectors: number
  pendingSectors: number
  uncorrectableErrors: number
  wearLevel: number | null
  readSpeed: number
  writeSpeed: number
  diskScore: number
}

export interface DiskInfo {
  drives: DiskDriveInfo[]
  partitions: {
    fs: string
    mount: string
    size: number
    used: number
    usedPercent: number
  }[]
  totalReadSpeed: number
  totalWriteSpeed: number
  overallDiskScore: number
}

export async function getDiskInfo(): Promise<DiskInfo> {
  const [siDisks, siFsSize, siFsStats] = await Promise.all([
    si.diskLayout(),
    si.fsSize(),
    si.fsStats().catch(() => null)
  ])

  const drives: DiskDriveInfo[] = siDisks.map((disk) => {
    let healthPercent: number | null = null
    let smartPassed: boolean | null = null

    if (disk.smartStatus === 'Ok') {
      healthPercent = 95
      smartPassed = true
    } else if (disk.smartStatus === 'Caution') {
      healthPercent = 60
      smartPassed = false
    } else if (disk.smartStatus === 'Bad') {
      healthPercent = 20
      smartPassed = false
    } else {
      healthPercent = null
      smartPassed = null
    }

    const scoreBase = healthPercent ?? 80
    const diskScore =
      scoreBase >= 80
        ? Math.round(75 + (scoreBase - 80) * 1.25)
        : scoreBase >= 60
        ? Math.round(50 + (scoreBase - 60))
        : Math.round(scoreBase * 0.83)

    return {
      name: disk.name || disk.device || 'Unknown',
      type: disk.type || 'Unknown',
      size: disk.size,
      temperature:
        disk.temperature !== null && disk.temperature !== undefined ? disk.temperature : null,
      healthStatus:
        disk.smartStatus === 'Ok'
          ? 'Good'
          : disk.smartStatus === 'Caution'
          ? 'Caution'
          : disk.smartStatus === 'Bad'
          ? 'Bad'
          : 'Unknown',
      healthPercent,
      smartPassed,
      reallocatedSectors: 0,
      pendingSectors: 0,
      uncorrectableErrors: 0,
      wearLevel: null,
      readSpeed: 0,
      writeSpeed: 0,
      diskScore
    }
  })

  const partitions = siFsSize.map((fs) => ({
    fs: fs.fs,
    mount: fs.mount,
    size: fs.size,
    used: fs.used,
    usedPercent: Math.round(fs.use * 10) / 10
  }))

  // Prefer byte rates when available (Linux/macOS). On Windows these are often 0.
  const totalReadSpeed = siFsStats?.rx_sec ?? 0
  const totalWriteSpeed = siFsStats?.wx_sec ?? 0

  const overallDiskScore =
    drives.length === 0
      ? 80
      : Math.round(drives.reduce((sum, d) => sum + d.diskScore, 0) / drives.length)

  return {
    drives,
    partitions,
    totalReadSpeed,
    totalWriteSpeed,
    overallDiskScore
  }
}
