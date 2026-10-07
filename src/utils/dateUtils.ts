export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', options ?? { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  return formatDate(dateStr, { month: 'short', day: 'numeric' })
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/** "Jan 15, 2024 · 2:30 PM" from an ISO string */
export function formatDateTime(isoString: string): string {
  const d = new Date(isoString)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

/** "Today · 2:30 PM" or "Jan 15 · 2:30 PM" from an ISO string */
export function formatDateTimeShort(isoString: string): string {
  const d = new Date(isoString)
  const dateStr = d.toISOString().split('T')[0]
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  if (dateStr === getTodayISO()) return `Today · ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${time}`
}

/** "Today · 2:30:45 PM" or "Jan 15 · 2:30:45 PM" from a Unix ms timestamp */
export function formatTimestampFull(ts: number): string {
  const d = new Date(ts)
  const dateStr = d.toISOString().split('T')[0]
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (dateStr === getTodayISO()) return `Today · ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${time}`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function formatContractionDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getPregnancyWeek(dueDateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dueDateStr + 'T00:00:00')
  dueDate.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const weeksPassed = Math.floor((280 - daysRemaining) / 7)
  return Math.max(1, Math.min(40, weeksPassed))
}

export function getPregnancyProgress(dueDateStr: string): number {
  const week = getPregnancyWeek(dueDateStr)
  return Math.min(100, Math.round((week / 40) * 100))
}

export function getTrimester(week: number): number {
  if (week <= 13) return 1
  if (week <= 26) return 2
  return 3
}

export function getLast7Days(): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayISO()
}

export function getRelativeDay(dateStr: string): string {
  const today = getTodayISO()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  return formatDate(dateStr, { month: 'short', day: 'numeric' })
}
