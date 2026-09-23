import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface DiagnosticHistoryRow {
  id: number
  timestamp: string
  overall_score: number
  battery_score: number
  thermal_score: number
  disk_score: number
  cpuram_score: number
  battery_health_percent: number
  cpu_temp: number
  ram_used_percent: number
}

type Severity = 'Healthy' | 'Attention' | 'Critical' | 'Unknown'

function severityFromScore(score: number): Severity {
  if (score >= 70) return 'Healthy'
  if (score >= 40) return 'Attention'
  return 'Critical'
}

function severityColor(s: Severity): [number, number, number] {
  if (s === 'Healthy') return [22, 163, 120]
  if (s === 'Attention') return [217, 119, 6]
  if (s === 'Critical') return [220, 38, 38]
  return [100, 116, 139]
}

function gradeFromScore(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function minMax(nums: number[]): { min: number; max: number } {
  if (nums.length === 0) return { min: 0, max: 0 }
  return { min: Math.min(...nums), max: Math.max(...nums) }
}

function buildFindings(latest: DiagnosticHistoryRow): { area: string; status: Severity; detail: string }[] {
  const findings: { area: string; status: Severity; detail: string }[] = []

  findings.push({
    area: 'Overall health',
    status: severityFromScore(latest.overall_score),
    detail: `Composite score ${latest.overall_score}/100 (grade ${gradeFromScore(latest.overall_score)}).`
  })

  const battSev =
    latest.battery_health_percent > 0 && latest.battery_health_percent < 40
      ? 'Critical'
      : latest.battery_health_percent > 0 && latest.battery_health_percent < 60
      ? 'Attention'
      : severityFromScore(latest.battery_score)
  findings.push({
    area: 'Battery',
    status: battSev as Severity,
    detail:
      latest.battery_health_percent > 0
        ? `Wear indicator ${latest.battery_health_percent.toFixed(1)}% of design capacity; module score ${latest.battery_score}.`
        : `Module score ${latest.battery_score}. Capacity wear data unavailable.`
  })

  const thermSev =
    latest.cpu_temp > 90 ? 'Critical' : latest.cpu_temp > 80 ? 'Attention' : severityFromScore(latest.thermal_score)
  findings.push({
    area: 'Thermal',
    status: thermSev as Severity,
    detail: `Recorded temperature ${latest.cpu_temp.toFixed(1)}°C; thermal score ${latest.thermal_score}. Note: reading may be package or system-zone depending on available sensors.`
  })

  findings.push({
    area: 'Storage',
    status: severityFromScore(latest.disk_score),
    detail: `Disk health score ${latest.disk_score}. Verify SMART / PhysicalDisk status in Windows Settings if Attention or Critical.`
  })

  const ramSev =
    latest.ram_used_percent > 90 ? 'Critical' : latest.ram_used_percent > 85 ? 'Attention' : severityFromScore(latest.cpuram_score)
  findings.push({
    area: 'CPU / RAM',
    status: ramSev as Severity,
    detail: `RAM utilization ${latest.ram_used_percent.toFixed(1)}%; CPU/RAM score ${latest.cpuram_score}.`
  })

  return findings
}

function buildActions(findings: { area: string; status: Severity; detail: string }[]): string[] {
  const actions: string[] = []
  for (const f of findings) {
    if (f.status === 'Healthy') continue
    if (f.area === 'Battery') {
      actions.push('Battery: Confirm design vs full-charge capacity in powercfg /batteryreport; plan replacement if wear < 60%.')
    } else if (f.area === 'Thermal') {
      actions.push('Thermal: Clear vents, verify fan RPM, compare package temp in LibreHardwareMonitor; reseat cooler if sustained > 90°C.')
    } else if (f.area === 'Storage') {
      actions.push('Storage: Run Get-PhysicalDisk / chkdsk; back up data if health is Caution or Bad; check free space on system volume.')
    } else if (f.area === 'CPU / RAM') {
      actions.push('CPU/RAM: Identify top processes in Task Manager; close memory leaks; consider RAM upgrade if sustained > 85%.')
    } else if (f.area === 'Overall health') {
      actions.push('Overall: Prioritize Critical subsystem findings below before closing the ticket.')
    }
  }
  if (actions.length === 0) {
    actions.push('No urgent remediation required. Continue scheduled monitoring and advise user on standard maintenance.')
  }
  actions.push('Retain this PDF in the ticket attachment and re-scan after remediation.')
  return actions
}

/**
 * Generate an IT technical support style diagnostic PDF from LapCharm history snapshots.
 */
export function generateItDiagnosticPdf(history: DiagnosticHistoryRow[], windowDays: number): void {
  if (history.length === 0) return

  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
  const latest = sorted[sorted.length - 1]
  const oldest = sorted[0]
  const overallSev = severityFromScore(latest.overall_score)
  const reportId = `LC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(latest.id).padStart(4, '0')}`
  const generatedAt = new Date()

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14

  // ── Header bar ─────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('LapCharm — Laptop Health Diagnostic Report', margin, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('IT Technical Support · Endpoint diagnostics', margin, 19)
  doc.setFontSize(8)
  doc.text(`Report ID: ${reportId}`, pageW - margin, 12, { align: 'right' })
  doc.text(`Classification: Internal use`, pageW - margin, 19, { align: 'right' })

  // ── Meta block ─────────────────────────────────────────────
  let y = 36
  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('1. Report metadata', margin, y)
  y += 2

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' }
    },
    body: [
      ['Generated', generatedAt.toLocaleString()],
      ['Tool', `LapCharm local diagnostics (window: last ${windowDays === 1 ? '24 hours' : `${windowDays} days`})`],
      ['Snapshots analyzed', String(sorted.length)],
      ['Observation period', `${new Date(oldest.timestamp).toLocaleString()} → ${new Date(latest.timestamp).toLocaleString()}`],
      ['Endpoint', 'Local Windows workstation (data collected on-device; not transmitted)'],
      ['Prepared for', 'IT Technical Support / Helpdesk ticket attachment']
    ]
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Executive summary ──────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text('2. Executive summary', margin, y)
  y += 6

  const sevRgb = severityColor(overallSev)
  doc.setFillColor(...sevRgb)
  doc.roundedRect(margin, y - 4, 38, 8, 1, 1, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(overallSev.toUpperCase(), margin + 19, y + 1.2, { align: 'center' })

  doc.setTextColor(30, 41, 59)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(
    `Latest overall score ${latest.overall_score}/100 (grade ${gradeFromScore(latest.overall_score)}). ` +
      `Period average ${avg(sorted.map((r) => r.overall_score))}/100 ` +
      `(range ${minMax(sorted.map((r) => r.overall_score)).min}–${minMax(sorted.map((r) => r.overall_score)).max}).`,
    margin + 42,
    y + 1
  )
  y += 10

  const summaryLines = doc.splitTextToSize(
    overallSev === 'Healthy'
      ? 'Endpoint appears within acceptable operating ranges for monitored subsystems. Continue routine monitoring.'
      : overallSev === 'Attention'
      ? 'One or more subsystems require attention. Review findings and recommended actions before closing the support case.'
      : 'Critical indicators detected. Prioritize remediation and data protection (especially storage/battery) before returning the device to the user.',
    pageW - margin * 2
  )
  doc.text(summaryLines, margin, y)
  y += summaryLines.length * 4.5 + 6

  // ── Findings ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('3. Subsystem findings (latest snapshot)', margin, y)
  y += 3

  const findings = buildFindings(latest)
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Subsystem', 'Status', 'Assessment']],
    body: findings.map((f) => [f.area, f.status, f.detail]),
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.2, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      1: { cellWidth: 24 },
      2: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const status = String(data.cell.raw) as Severity
        data.cell.styles.textColor = severityColor(status)
        data.cell.styles.fontStyle = 'bold'
      }
    }
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // ── Recommended actions ────────────────────────────────────
  if (y > 250) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text('4. Recommended actions (technician)', margin, y)
  y += 6

  const actions = buildActions(findings)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  for (let i = 0; i < actions.length; i++) {
    const lines = doc.splitTextToSize(`${i + 1}. ${actions[i]}`, pageW - margin * 2 - 2)
    if (y + lines.length * 4.5 > 275) {
      doc.addPage()
      y = 20
    }
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 2
  }

  y += 4

  // ── History table ──────────────────────────────────────────
  if (y > 230) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text('5. Historical telemetry', margin, y)
  y += 3

  const historyRows = [...sorted].reverse().slice(0, 40).map((row) => [
    new Date(row.timestamp).toLocaleString(),
    row.overall_score,
    row.battery_score,
    row.thermal_score,
    row.disk_score,
    row.cpuram_score,
    `${row.battery_health_percent?.toFixed(1) ?? '—'}%`,
    `${row.cpu_temp?.toFixed(1) ?? '—'}°C`,
    `${row.ram_used_percent?.toFixed(1) ?? '—'}%`
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Timestamp', 'Overall', 'Batt', 'Therm', 'Disk', 'CPU/RAM', 'Batt %', 'Temp', 'RAM %']],
    body: historyRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7 },
    styles: { fontSize: 7, cellPadding: 1.4 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  })

  // ── Footer / disclaimer on every page ──────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setDrawColor(203, 213, 225)
    doc.line(margin, 285, pageW - margin, 285)
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Disclaimer: Automated local telemetry for IT support. Confirm Critical findings with OEM tools before hardware replacement.',
      margin,
      290
    )
    doc.text(`Page ${p} of ${pageCount} · ${reportId}`, pageW - margin, 290, { align: 'right' })
  }

  doc.save(`LapCharm-IT-Diagnostic-${reportId}.pdf`)
}
