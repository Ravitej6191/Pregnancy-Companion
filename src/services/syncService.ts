import {
  collection, doc, getDocs, getDoc, query, where, orderBy, writeBatch,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { firestore, isFirebaseConfigured } from '../config/firebase'
import { db as localDb, SYNCED_TABLES, uidFor, type SyncedTable } from '../db/database'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { ensureWebAuth } from './googleAuth'
import { decideMerge, toCloudData, recordDocId } from './syncCore'
import { scheduleReminder, cancelReminder } from '../notifications/notificationService'
import type { Reminder } from '../types'

/**
 * Cloud sync: per-record documents under users/{uid}/records, merged with
 * last-writer-wins on `updatedAt` and tombstones for deletions. Nothing is ever
 * bulk-overwritten, so syncing can never wipe newer data on either side, and no
 * single document can outgrow Firestore's 1 MiB limit.
 *
 * Photos (profile, journal, doctor visits, ultrasounds) are intentionally local-only.
 */

const BATCH_LIMIT = 400
const LEGACY_DOC = ['data', 'backup'] as const

interface CloudRecord {
  table: SyncedTable
  uid: string
  updatedAt: string
  deleted: boolean
  data?: Record<string, unknown>
  syncedAt?: Timestamp
}

type Row = Record<string, unknown> & { id?: number; uid?: string; updatedAt?: string }

// Per-account sync cursors. Losing them only causes a harmless re-sync.
const key = (k: string, uid: string) => `sync:${k}:${uid}`
const getItem = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const setItem = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* storage unavailable */ } }

function requireReady() {
  const { user } = useAuthStore.getState()
  if (!user) throw new Error('Not signed in')
  if (!isFirebaseConfigured || !firestore) throw new Error('Firebase not configured')
  return { user, fs: firestore }
}

async function withSyncState<T>(fn: () => Promise<T>): Promise<T> {
  const { setSyncing, setLastSyncedAt, setSyncError } = useAuthStore.getState()
  setSyncing(true)
  setSyncError(null)
  try {
    const result = await fn()
    setLastSyncedAt(new Date().toISOString())
    return result
  } catch (err) {
    setSyncError(err instanceof Error ? err.message : 'Sync failed')
    throw err
  } finally {
    setSyncing(false)
  }
}

// ─── Pull (cloud → local, merging) ───────────────────────────────────────────

async function pullInternal(): Promise<{ applied: number }> {
  const { user, fs } = requireReady()
  await ensureWebAuth(user.uid)

  const cursorMs = Number(getItem(key('pullCursor', user.uid)) ?? 0)
  const firstSyncOnDevice = getItem('sync:syncedUid') !== user.uid
  const records = collection(fs, 'users', user.uid, 'records')
  const snap = await getDocs(
    query(records, where('syncedAt', '>', Timestamp.fromMillis(cursorMs)), orderBy('syncedAt')),
  )

  let applied = 0
  let profileApplied = false
  let maxSynced = cursorMs
  const remindersToSchedule: number[] = []
  const reminderIdsToCancel: number[] = []

  localDb.suppressTombstones = true
  try {
    for (const d of snap.docs) {
      const rec = d.data() as CloudRecord
      const ms = rec.syncedAt?.toMillis?.() ?? 0
      if (ms > maxSynced) maxSynced = ms
      if (!SYNCED_TABLES.includes(rec.table)) continue

      const table = localDb.table(rec.table)
      const local = (await table.where('uid').equals(rec.uid).first()) as Row | undefined
      const tomb = await localDb.tombstones.get(`${rec.table}:${rec.uid}`)

      const action = decideMerge({
        remote: { deleted: !!rec.deleted, updatedAt: rec.updatedAt },
        local,
        tombstone: tomb,
        preferRemote: rec.table === 'pregnancyProfile' && firstSyncOnDevice,
      })
      if (action === 'skip') continue

      if (action === 'delete-local') {
        await table.delete(local!.id as number)
        if (rec.table === 'reminders') reminderIdsToCancel.push(local!.capacitorNotificationId as number)
      } else {
        const data: Row = { ...(rec.data ?? {}), uid: rec.uid, updatedAt: rec.updatedAt }
        if (local) {
          // Keep the local primary key and local-only blobs (photos).
          data.id = local.id
          for (const f of ['photo', 'image']) if (local[f] !== undefined) data[f] = local[f]
        }
        if (rec.table === 'reminders') {
          reminderIdsToCancel.push((local?.capacitorNotificationId as number | undefined) ?? -1)
          data.capacitorNotificationId = -1
        }
        try {
          if (local) await table.put(data); else await table.add(data)
        } catch (err) {
          // e.g. a unique-date clash with a pre-sync row: keep local, don't abort the whole pull
          console.warn('[sync] could not apply record', rec.table, rec.uid, err)
          continue
        }
        if (tomb) await localDb.tombstones.delete(tomb.key)
        if (rec.table === 'pregnancyProfile') profileApplied = true
        if (rec.table === 'reminders') {
          const saved = (await table.where('uid').equals(rec.uid).first()) as Row
          if (saved.isActive) remindersToSchedule.push(saved.id as number)
        }
      }
      applied++
    }
  } finally {
    localDb.suppressTombstones = false
  }

  // Notifications are per-device: cancel stale alarms and (re)schedule incoming active reminders.
  for (const id of reminderIdsToCancel) await cancelReminder(id)
  for (const id of remindersToSchedule) {
    const r = await localDb.reminders.get(id)
    if (!r) continue
    const notifId = await scheduleReminder(r as Reminder)
    await localDb.reminders.update(id, { capacitorNotificationId: notifId, updatedAt: r.updatedAt })
  }

  setItem(key('pullCursor', user.uid), String(maxSynced))

  if (profileApplied) {
    const p = (await localDb.pregnancyProfile.toArray())[0]
    if (p) {
      useAppStore.getState().setProfile(p)
      useAppStore.getState().setIsOnboarding(false)
    }
  }
  return { applied }
}

/** One-time import of the pre-v2 single-document backup (`users/{uid}/data/backup`). */
async function importLegacyBackup(): Promise<boolean> {
  const { user, fs } = requireReady()
  const flag = key('legacyDone', user.uid)
  if (getItem(flag)) return false

  const snap = await getDoc(doc(fs, 'users', user.uid, ...LEGACY_DOC))
  if (!snap.exists()) { setItem(flag, '1'); return false }

  const b = snap.data() as Record<string, unknown>
  const at = typeof b.backedUpAt === 'string' ? b.backedUpAt : new Date().toISOString()
  const sources: Array<[SyncedTable, unknown]> = [
    ['pregnancyProfile', b.profile ? [b.profile] : []],
    ['reminders', b.reminders], ['dailyTasks', b.dailyTasks], ['kickSessions', b.kickSessions],
    ['contractions', b.contractions], ['journalEntries', b.journal], ['healthMetrics', b.healthMetrics],
    ['doctorVisits', b.doctorVisits], ['moodLogs', b.moods], ['checklistItems', b.checklistItems],
  ]
  // Tables with deterministic ids merge safely with existing rows; the rest are only
  // imported into an empty table so a legacy backup can never duplicate local data.
  const merge = new Set<SyncedTable>(['moodLogs', 'dailyTasks', 'checklistItems'])
  let imported = false
  for (const [name, items] of sources) {
    if (!Array.isArray(items) || items.length === 0) continue
    const table = localDb.table(name)
    if (!merge.has(name) && (await table.count()) > 0) continue
    for (const raw of items as Row[]) {
      const rest: Row = { ...raw }
      delete rest.id
      const uid = rest.uid ?? uidFor(name, rest as Parameters<typeof uidFor>[1])
      if (await table.where('uid').equals(uid).first()) continue
      if (name === 'reminders') rest.capacitorNotificationId = -1
      try {
        await table.add({ ...rest, uid, updatedAt: rest.updatedAt ?? at })
        imported = true
      } catch (err) {
        console.warn('[sync] legacy import skipped a row', name, err)
      }
    }
  }
  setItem(flag, '1')
  return imported
}

// ─── Push (local changes → cloud) ────────────────────────────────────────────

async function pushInternal(): Promise<number> {
  const { user, fs } = requireReady()
  await ensureWebAuth(user.uid)

  const since = getItem(key('pushedAt', user.uid)) ?? ''
  const startedAt = new Date().toISOString()
  const ops: Array<{ id: string; rec: CloudRecord }> = []

  for (const name of SYNCED_TABLES) {
    const rows = (await localDb.table(name).toArray()) as Row[]
    for (const r of rows) {
      if (!r.uid || (since && (r.updatedAt ?? '') <= since)) continue
      ops.push({
        id: recordDocId(name, r.uid),
        rec: { table: name, uid: r.uid, updatedAt: r.updatedAt ?? startedAt, deleted: false, data: toCloudData(r) },
      })
    }
  }
  for (const t of await localDb.tombstones.toArray()) {
    if (since && t.deletedAt <= since) continue
    ops.push({
      id: recordDocId(t.table, t.uid),
      rec: { table: t.table as SyncedTable, uid: t.uid, updatedAt: t.deletedAt, deleted: true },
    })
  }

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(fs)
    for (const { id, rec } of ops.slice(i, i + BATCH_LIMIT)) {
      batch.set(doc(fs, 'users', user.uid, 'records', id), { ...rec, syncedAt: serverTimestamp() })
    }
    await batch.commit()
  }
  setItem(key('pushedAt', user.uid), startedAt)
  return ops.length
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Full two-way sync: pull + merge, then push local changes. Safe to call at any time
 * (launch, sign-in, manual "Backup") — it never discards newer data on either side.
 */
export async function pushToCloud(): Promise<void> {
  await withSyncState(async () => {
    const { user } = requireReady()
    await pullInternal()
    await importLegacyBackup()
    await pushInternal()
    setItem('sync:syncedUid', user.uid)
  })
}

/** Pull + merge only. `restored` is true when any cloud data was applied locally. */
export async function pullFromCloud(): Promise<{ restored: boolean }> {
  return withSyncState(async () => {
    const { user } = requireReady()
    const { applied } = await pullInternal()
    const legacy = await importLegacyBackup()
    setItem('sync:syncedUid', user.uid)
    return { restored: applied > 0 || legacy }
  })
}

/** Deletes all of this account's cloud data (records + legacy backup document). */
export async function deleteFromCloud(): Promise<void> {
  const { user } = useAuthStore.getState()
  if (!user || !isFirebaseConfigured || !firestore) return
  await ensureWebAuth(user.uid)
  const snap = await getDocs(collection(firestore, 'users', user.uid, 'records'))
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(firestore)
    snap.docs.slice(i, i + BATCH_LIMIT).forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
  const legacy = doc(firestore, 'users', user.uid, ...LEGACY_DOC)
  if ((await getDoc(legacy)).exists()) {
    const batch = writeBatch(firestore)
    batch.delete(legacy)
    await batch.commit()
  }
}
