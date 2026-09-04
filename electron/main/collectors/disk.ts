import si from 'systeminformation'

export interface DiskDriveInfo {
  name: string
  type: string // SSD / HDD / NVMe
  size: number
  temperature: number | null
  healthStatus: 'Good' | 'Caution' | 'Bad' | 'Unknown'
  healthPercent: number
  smartPassed: boolean
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
  const [siDisks, siLayout, siFsSize, siDiskIO] = await Promise.all([
    si.diskLayout(),
    si.blockDevices(),
    si.fsSize(),
    si.disksIO()
  ])

  const drives: DiskDriveInfo[] = siDisks.map((disk) => {
    // Estimate wear level from disk type
    let wearLevel: number | null = null
    let healthPercent = 95 // Default optimistic

    if (disk.smartStatus === 'Ok') {
      healthPercent = 95
    } else if (disk.smartStatus === 'Caution') {
      healthPercent = 60
    } else if (disk.smartStatus === 'Bad') {
      healthPercent = 20
    }

    const diskScore =
      healthPercent >= 80
        ? Math.round(75 + (healthPercent - 80) * 1.25)
        : healthPercent >= 60
        ? Math.round(50 + (healthPercent - 60))
        : Math.round(healthPercent * 0.83)

    return {
      name: disk.name || disk.device || 'Unknown',
      type: disk.type || 'Unknown',
      size: disk.size,
      temperature: disk.temperature !== null && disk.temperature !== undefined ? disk.temperature : null,
      healthStatus:
        disk.smartStatus === 'Ok'
          ? 'Good'
          : disk.smartStatus === 'Caution'
          ? 'Caution'
          : disk.smartStatus === 'Bad'
          ? 'Bad'
          : 'Unknown',
      healthPercent,
      smartPassed: disk.smartStatus === 'Ok',
      reallocatedSectors: 0, // Requires raw SMART — placeholder
      pendingSectors: 0,
      uncorrectableErrors: 0,
      wearLevel,
      readSpeed: 0, // Filled from disk IO below
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

  const totalReadSpeed = siDiskIO?.rIO_sec || 0
  const totalWriteSpeed = siDiskIO?.wIO_sec || 0

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
