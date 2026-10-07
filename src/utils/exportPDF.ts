import jsPDF from 'jspdf'
import { db } from '../db/database'
import { MOODS } from './constants'

const BRAND_PINK = [255, 143, 171] as const
const DARK = [40, 20, 30] as const
const GRAY = [120, 100, 110] as const
const LIGHT_GRAY = [240, 235, 238] as const

function line(doc: jsPDF, y: number) {
  doc.setDrawColor(...LIGHT_GRAY)
  doc.line(14, y, 196, y)
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...BRAND_PINK)
  doc.roundedRect(14, y, 182, 9, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(title.toUpperCase(), 18, y + 6.5)
  doc.setTextColor(...DARK)
  return y + 14
}

function checkPageBreak(doc: jsPDF, y: number, needed = 12): number {
  if (y + needed > 280) {
    doc.addPage()
    return 20
  }
  return y
}

export async function exportHealthReportPDF(
  firstName: string,
  week: number,
  daysRemaining: number,
  dueDate: string,
  doctorName: string,
  hospitalName: string,
  bloodType: string
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  // ─── Cover header ───
  doc.setFillColor(...BRAND_PINK)
  doc.rect(0, 0, 210, 38, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('Katyamma Care', 14, 16)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Health Report — Generated for your doctor', 14, 25)
  const now = new Date()
  doc.text(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 14, 32)
  doc.setTextColor(...DARK)

  let y = 48

  // ─── Profile ───
  y = sectionHeader(doc, 'Patient Profile', y)
  const profileRows = [
    ['Name', firstName],
    ['Current Week', `${week} / 40`],
    ['Days Remaining', `${daysRemaining} days`],
    ['Due Date', dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'],
    ['Doctor', doctorName || '—'],
    ['Hospital', hospitalName || '—'],
    ['Blood Type', bloodType || '—'],
  ]
  doc.setFontSize(10)
  for (const [label, value] of profileRows) {
    y = checkPageBreak(doc, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRAY)
    doc.text(label, 18, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(String(value), 70, y)
    y += 7
  }
  y += 4

  // ─── Health Metrics ───
  const metrics = await db.healthMetrics.orderBy('date').reverse().limit(90).toArray()
  const dates = [...new Set(metrics.map(m => m.date))].slice(0, 30)

  if (dates.length > 0) {
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Health Metrics (last 30 days)', y)
    // Header row
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Date', 18, y)
    doc.text('Sleep (hrs)', 70, y)
    doc.text('Weight (kg)', 110, y)
    doc.text('Steps', 150, y)
    y += 4
    line(doc, y); y += 4

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    for (const date of dates) {
      y = checkPageBreak(doc, y)
      const dayMetrics = metrics.filter(m => m.date === date)
      const sleep = dayMetrics.find(m => m.type === 'sleep')?.value ?? null
      const weight = dayMetrics.find(m => m.type === 'weight')?.value ?? null
      const steps = dayMetrics.find(m => m.type === 'steps')?.value ?? null
      doc.setFontSize(9)
      doc.text(new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 18, y)
      doc.text(sleep != null ? String(sleep) : '—', 70, y)
      doc.text(weight != null ? String(weight) : '—', 110, y)
      doc.text(steps != null ? steps.toLocaleString() : '—', 150, y)
      y += 6
    }
    y += 4
  }

  // ─── Mood History ───
  const moodLogs = await db.moodLogs.orderBy('date').reverse().limit(30).toArray()
  if (moodLogs.length > 0) {
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Mood History', y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Date', 18, y)
    doc.text('Mood', 65, y)
    doc.text('Notes', 120, y)
    y += 4
    line(doc, y); y += 4

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    for (const log of moodLogs) {
      y = checkPageBreak(doc, y)
      const moodDef = MOODS.find(m => m.value === log.moodLabel)
      doc.setFontSize(9)
      doc.text(new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 18, y)
      doc.text(moodDef?.label ?? log.moodLabel, 65, y)
      if (log.note) {
        const noteLines = doc.splitTextToSize(log.note, 70)
        doc.text(noteLines[0], 120, y)
      }
      y += 6
    }
    y += 4
  }

  // ─── Kick Sessions ───
  const kickSessions = await db.kickSessions.orderBy('date').reverse().limit(30).toArray()
  if (kickSessions.length > 0) {
    const kickByDate: Record<string, number> = {}
    for (const s of kickSessions) {
      kickByDate[s.date] = (kickByDate[s.date] ?? 0) + s.kickCount
    }
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Daily Kick Counts', y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Date', 18, y)
    doc.text('Total Kicks', 80, y)
    y += 4
    line(doc, y); y += 4

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    for (const [date, count] of Object.entries(kickByDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)) {
      y = checkPageBreak(doc, y)
      doc.setFontSize(9)
      doc.text(new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 18, y)
      doc.text(String(count), 80, y)
      y += 6
    }
    y += 4
  }

  // ─── Doctor Visits ───
  const visits = await db.doctorVisits.orderBy('date').reverse().toArray()
  if (visits.length > 0) {
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Doctor Visits', y)

    for (const visit of visits) {
      y = checkPageBreak(doc, y, 24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...DARK)
      doc.text(`${new Date(visit.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} — Week ${visit.weekNumber}`, 18, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      y += 5
      const details: string[] = []
      if (visit.weight > 0) details.push(`Weight: ${visit.weight} kg`)
      if (visit.bloodPressure) details.push(`BP: ${visit.bloodPressure}`)
      if (visit.fetalHeartRate > 0) details.push(`FHR: ${visit.fetalHeartRate} bpm`)
      if (details.length) { doc.text(details.join('   '), 18, y); y += 5 }
      if (visit.notes) {
        const noteLines = doc.splitTextToSize(visit.notes, 170)
        doc.setTextColor(...DARK)
        doc.text(noteLines.slice(0, 3), 18, y)
        y += noteLines.slice(0, 3).length * 4.5
      }
      y += 3
    }
    y += 2
  }

  // ─── Ultrasound ───
  const photos = await db.ultrasoundPhotos.orderBy('date').reverse().toArray()
  if (photos.length > 0) {
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Ultrasound Records', y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('Date', 18, y)
    doc.text('Gestational Age', 65, y)
    doc.text('Caption', 120, y)
    y += 4
    line(doc, y); y += 4

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    for (const photo of photos) {
      y = checkPageBreak(doc, y)
      doc.setFontSize(9)
      doc.text(new Date(photo.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 18, y)
      doc.text(photo.gestationalAge || '—', 65, y)
      if (photo.caption) {
        const cap = doc.splitTextToSize(photo.caption, 65)
        doc.text(cap[0], 120, y)
      }
      y += 6
    }
    y += 4
  }

  // ─── Journal Entries ───
  const journals = await db.journalEntries.orderBy('date').reverse().limit(20).toArray()
  if (journals.length > 0) {
    y = checkPageBreak(doc, y, 20)
    y = sectionHeader(doc, 'Journal Entries', y)

    for (const entry of journals) {
      y = checkPageBreak(doc, y, 20)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...GRAY)
      doc.text(new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 18, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      y += 5
      const lines = doc.splitTextToSize(entry.notes, 172)
      const visibleLines = lines.slice(0, 4)
      doc.text(visibleLines, 18, y)
      y += visibleLines.length * 4.5 + 4
    }
  }

  // ─── Footer on each page ───
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Katyamma Care — Confidential — Page ${i} of ${pageCount}`, 14, 290)
  }

  doc.save(`pregnancy-report-${new Date().toISOString().slice(0, 10)}.pdf`)
}
