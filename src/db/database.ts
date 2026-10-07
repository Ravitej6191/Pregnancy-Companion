import Dexie, { type Table, type Transaction } from 'dexie'
import type {
  PregnancyProfile, KickSession, Contraction, JournalEntry,
  HealthMetric, ChecklistItem, DoctorVisit, UltrasoundPhoto,
  Reminder, MoodLog, DailyTask, Tombstone,
} from '../types'
import { dataUrlToBlob } from '../utils/images'

/** Tables that are synced to the cloud (ultrasound photos are local-only). */
export const SYNCED_TABLES = [
  'pregnancyProfile', 'kickSessions', 'contractions', 'journalEntries',
  'healthMetrics', 'checklistItems', 'doctorVisits', 'reminders',
  'moodLogs', 'dailyTasks',
] as const
export type SyncedTable = typeof SYNCED_TABLES[number]

function randomUid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * Records that are naturally unique get a deterministic id so independently-created
 * copies on two devices (daily mood, today's task list, seeded checklist) converge
 * instead of duplicating after a sync. Everything else gets a random UUID.
 */
export function uidFor(table: string, obj: { date?: string; taskKey?: string; category?: string; label?: string; isCustom?: boolean }): string {
  if (table === 'moodLogs' && obj.date) return `mood_${obj.date}`
  if (table === 'dailyTasks' && obj.date && obj.taskKey) return `task_${obj.date}_${obj.taskKey}`
  if (table === 'checklistItems' && obj.isCustom === false && obj.label) return `checklist_${obj.category}_${obj.label}`
  return randomUid()
}

class PregnancyDB extends Dexie {
  pregnancyProfile!: Table<PregnancyProfile>
  kickSessions!: Table<KickSession>
  contractions!: Table<Contraction>
  journalEntries!: Table<JournalEntry>
  healthMetrics!: Table<HealthMetric>
  checklistItems!: Table<ChecklistItem>
  doctorVisits!: Table<DoctorVisit>
  ultrasoundPhotos!: Table<UltrasoundPhoto>
  reminders!: Table<Reminder>
  moodLogs!: Table<MoodLog>
  dailyTasks!: Table<DailyTask>
  tombstones!: Table<Tombstone, string>

  /** When true, deletions are not recorded as tombstones (used while applying remote deletes). */
  suppressTombstones = false

  /** True during schema upgrades so backfills do not bump updatedAt. */
  migrating = false

  constructor() {
    super('PregnancyCareDB')
    this.version(1).stores({
      pregnancyProfile: '++id',
      kickSessions: '++id, date, weekNumber',
      contractions: '++id, sessionId, date',
      journalEntries: '++id, date, weekNumber, mood',
      healthMetrics: '++id, [date+type], date, type, weekNumber',
      checklistItems: '++id, category, isChecked',
      doctorVisits: '++id, date, weekNumber',
      ultrasoundPhotos: '++id, date, weekNumber',
      reminders: '++id, isActive, scheduledAt',
      moodLogs: '++id, &date',
    })
    // Version 2: added dailyTasks table
    this.version(2).stores({
      dailyTasks: '++id, date, taskKey, isCompleted',
    })
    // Versions 3–5 only added non-indexed fields (targetCount/completedCount,
    // photoBase64, imageBase64); the v6 upgrade backfills them.
    this.version(3).stores({})
    this.version(4).stores({})
    this.version(5).stores({})

    // Version 6: sync identity (`uid`, `updatedAt`), tombstones for deletes,
    // photos stored as Blobs, and defaults backfilled for rows written by old versions.
    this.version(6).stores({
      pregnancyProfile: '++id, uid',
      kickSessions: '++id, date, weekNumber, uid',
      contractions: '++id, sessionId, date, uid',
      journalEntries: '++id, date, weekNumber, mood, uid',
      healthMetrics: '++id, [date+type], date, type, weekNumber, uid',
      checklistItems: '++id, category, isChecked, uid',
      doctorVisits: '++id, date, weekNumber, uid',
      reminders: '++id, isActive, scheduledAt, uid',
      moodLogs: '++id, &date, uid',
      dailyTasks: '++id, date, taskKey, isCompleted, uid',
      tombstones: 'key, table',
    }).upgrade(async tx => {
      this.migrating = true
      try { await migrateToV6(tx) } finally { this.migrating = false }
    })

    this.installHooks()
  }

  private installHooks() {
    for (const name of SYNCED_TABLES) {
      const table = this.table(name)
      table.hook('creating', (_pk, obj) => {
        if (!obj.uid) obj.uid = uidFor(name, obj)
        if (!obj.updatedAt) obj.updatedAt = new Date().toISOString()
      })
      table.hook('updating', (mods) => {
        // A sync apply (or the app itself) may set updatedAt explicitly — respect it.
        if (this.migrating || 'updatedAt' in (mods as object)) return undefined
        return { updatedAt: new Date().toISOString() }
      })
      table.hook('deleting', (_pk, obj, tx) => {
        const uid = (obj as { uid?: string }).uid
        if (!uid || this.suppressTombstones) return
        // Write after the delete succeeds, outside the (narrow) delete transaction.
        const tomb: Tombstone = { key: `${name}:${uid}`, table: name, uid, deletedAt: new Date().toISOString() }
        const trans = tx as Transaction
        trans.on('complete', () => {
          Dexie.ignoreTransaction(() => { void db.tombstones.put(tomb).catch(() => {}) })
        })
      })
    }
  }
}

async function migrateToV6(tx: Transaction) {
  const now = new Date().toISOString()
  for (const name of SYNCED_TABLES) {
    await tx.table(name).toCollection().modify((row: Record<string, unknown>) => {
      if (!row.uid) row.uid = uidFor(name, row)
      if (!row.updatedAt) row.updatedAt = (row.updatedAt as string) || (row.createdAt as string) || now
    })
  }
  // Backfill fields introduced by v3–v5
  await tx.table('dailyTasks').toCollection().modify((t: Record<string, unknown>) => {
    if (typeof t.targetCount !== 'number') t.targetCount = 1
    if (typeof t.completedCount !== 'number') t.completedCount = t.isCompleted ? (t.targetCount as number) : 0
  })
  // base64 data URLs → Blobs
  const toBlob = (v: unknown) => (typeof v === 'string' && v.startsWith('data:') ? dataUrlToBlob(v) : undefined)
  await tx.table('pregnancyProfile').toCollection().modify((r: Record<string, unknown>) => {
    const b = toBlob(r.photoBase64); if (b) r.photo = b; delete r.photoBase64
  })
  await tx.table('journalEntries').toCollection().modify((r: Record<string, unknown>) => {
    const b = toBlob(r.photoBase64); if (b) r.photo = b; delete r.photoBase64; delete r.photoMimeType
  })
  await tx.table('doctorVisits').toCollection().modify((r: Record<string, unknown>) => {
    const b = toBlob(r.imageBase64); if (b) r.image = b; delete r.imageBase64; delete r.imageMimeType
  })
  await tx.table('ultrasoundPhotos').toCollection().modify((r: Record<string, unknown>) => {
    const b = toBlob(r.photoBase64); if (b) r.photo = b; delete r.photoBase64; delete r.photoMimeType
  })
}

export const db = new PregnancyDB()
