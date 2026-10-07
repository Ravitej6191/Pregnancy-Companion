import { describe, it, expect, beforeEach, vi } from 'vitest'
import Dexie from 'dexie'

async function freshDb() {
  vi.resetModules()
  await Dexie.delete('PregnancyCareDB')
  return (await import('./database')).db
}
const tick = () => new Promise(r => setTimeout(r, 20))

describe('sync metadata hooks', () => {
  let db: Awaited<ReturnType<typeof freshDb>>
  beforeEach(async () => { db = await freshDb() })

  it('stamps uid and updatedAt on create, and bumps updatedAt on update', async () => {
    const id = await db.kickSessions.add({ date: '2026-01-01', startTime: 0, endTime: 1, kickCount: 1, durationSeconds: 1, weekNumber: 20, notes: '' })
    const created = await db.kickSessions.get(id)
    expect(created?.uid).toBeTruthy()
    expect(created?.updatedAt).toBeTruthy()
    await tick()
    await db.kickSessions.update(id, { kickCount: 5 })
    const updated = await db.kickSessions.get(id)
    expect(updated!.updatedAt! > created!.updatedAt!).toBe(true)
    expect(updated?.uid).toBe(created?.uid)
  })

  it('records a tombstone when a synced row is deleted, but not when suppressed', async () => {
    const a = await db.kickSessions.add({ date: 'd', startTime: 0, endTime: 1, kickCount: 1, durationSeconds: 1, weekNumber: 1, notes: '' })
    const b = await db.kickSessions.add({ date: 'd', startTime: 0, endTime: 1, kickCount: 1, durationSeconds: 1, weekNumber: 1, notes: '' })
    const uidA = (await db.kickSessions.get(a))!.uid
    await db.kickSessions.delete(a)
    db.suppressTombstones = true
    await db.kickSessions.delete(b)
    db.suppressTombstones = false
    await tick()
    const tombs = await db.tombstones.toArray()
    expect(tombs.map(t => t.uid)).toEqual([uidA])
  })

  it('gives naturally-unique records deterministic ids so devices converge', async () => {
    await db.moodLogs.add({ date: '2026-02-02', moodScore: 3, moodLabel: 'okay', note: '', loggedAt: '' })
    expect((await db.moodLogs.toArray())[0].uid).toBe('mood_2026-02-02')
    await db.dailyTasks.add({ date: '2026-02-02', taskKey: 'water', label: 'w', emoji: '', isCompleted: false, category: '', completedAt: '', targetCount: 1, completedCount: 0 })
    expect((await db.dailyTasks.toArray())[0].uid).toBe('task_2026-02-02_water')
  })
})

describe('v5 to v6 upgrade', () => {
  it('backfills uid/updatedAt, task counts and converts base64 photos to Blobs', async () => {
    vi.resetModules()
    await Dexie.delete('PregnancyCareDB')
    const old = new Dexie('PregnancyCareDB')
    old.version(1).stores({
      pregnancyProfile: '++id', kickSessions: '++id, date, weekNumber', contractions: '++id, sessionId, date',
      journalEntries: '++id, date, weekNumber, mood', healthMetrics: '++id, [date+type], date, type, weekNumber',
      checklistItems: '++id, category, isChecked', doctorVisits: '++id, date, weekNumber',
      ultrasoundPhotos: '++id, date, weekNumber', reminders: '++id, isActive, scheduledAt', moodLogs: '++id, &date',
    })
    old.version(2).stores({ dailyTasks: '++id, date, taskKey, isCompleted' })
    await old.table('pregnancyProfile').add({ firstName: 'A', photoBase64: 'data:image/jpeg;base64,AAAA', createdAt: '2025-01-01' })
    await old.table('dailyTasks').add({ date: 'd', taskKey: 'k', isCompleted: true })
    old.close()

    const { db } = await import('./database')
    const profile = (await db.pregnancyProfile.toArray())[0] as unknown as Record<string, unknown>
    expect(profile.uid).toBeTruthy()
    expect(profile.updatedAt).toBe('2025-01-01')
    expect(profile.photo).toBeInstanceOf(Blob)
    expect(profile.photoBase64).toBeUndefined()
    const task = (await db.dailyTasks.toArray())[0]
    expect(task.targetCount).toBe(1)
    expect(task.completedCount).toBe(1)
  })
})
