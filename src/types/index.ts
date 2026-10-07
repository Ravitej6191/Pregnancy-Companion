export type MoodValue = 'great' | 'good' | 'okay' | 'tired' | 'sad'
export type MetricType = 'water' | 'sleep' | 'weight' | 'steps'
export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly'

/** Sync metadata stamped automatically by Dexie hooks (see db/database.ts). */
export interface SyncMeta {
  uid?: string        // stable cross-device identity
  updatedAt?: string  // ISO timestamp of last local change (last-writer-wins)
}

export interface Tombstone {
  key: string       // `${table}:${uid}`
  table: string
  uid: string
  deletedAt: string
}

export interface PregnancyProfile extends SyncMeta {
  id?: number
  firstName: string
  dueDate: string
  lmpDate: string
  doctorName: string
  hospitalName: string
  bloodType: string
  photo?: Blob
  createdAt: string
}

export interface KickSession extends SyncMeta {
  id?: number
  date: string
  startTime: number
  endTime: number
  kickCount: number
  durationSeconds: number
  weekNumber: number
  notes: string
}

export interface Contraction extends SyncMeta {
  id?: number
  sessionId: string
  startTime: number
  endTime: number
  duration: number
  intervalFromPrevious: number
  date: string
}

export interface JournalEntry extends SyncMeta {
  id?: number
  date: string
  weekNumber: number
  mood: MoodValue
  moodScore: number
  notes: string
  symptoms: string[]
  photo?: Blob
  createdAt: string
  updatedAt: string
}

export interface HealthMetric extends SyncMeta {
  id?: number
  date: string
  type: MetricType
  value: number
  unit: string
  weekNumber: number
  note: string
}

export interface ChecklistItem extends SyncMeta {
  id?: number
  category: string
  label: string
  isChecked: boolean
  isCustom: boolean
  sortOrder: number
  createdAt: string
}

export interface DoctorVisit extends SyncMeta {
  id?: number
  date: string
  weekNumber: number
  doctorName: string
  visitType: string
  weight: number
  bloodPressure: string
  fundalHeight: number
  fetalHeartRate: number
  notes: string
  nextVisitDate: string
  image?: Blob
  createdAt: string
}

export interface UltrasoundPhoto {
  id?: number
  date: string
  weekNumber: number
  photo: Blob
  caption: string
  gestationalAge: string
  createdAt: string
}

export interface Reminder extends SyncMeta {
  id?: number
  title: string
  body: string
  scheduledAt: string
  recurrence: RecurrenceType
  recurrenceDays: number[]
  isActive: boolean
  capacitorNotificationId: number
  category: string
  createdAt: string
}

export interface MoodLog extends SyncMeta {
  id?: number
  date: string
  moodScore: number
  moodLabel: MoodValue
  note: string
  loggedAt: string
}

export interface WeekGuide {
  week: number
  trimester: number
  babySize: string
  babySizeEmoji: string
  babySizeCm: number
  babyWeightG: number
  babyDevelopment: string
  momBody: string
  tipsForWeek: string[]
  symptoms: string[]
  nutritionTip: string
  exerciseTip: string
}

export interface DailyTask extends SyncMeta {
  id?: number
  date: string
  taskKey: string
  label: string
  emoji: string
  isCompleted: boolean
  category: string
  completedAt: string
  targetCount: number    // how many times per day (default 1)
  completedCount: number // how many times done so far (default 0)
}
