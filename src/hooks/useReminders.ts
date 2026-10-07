import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { Reminder } from '../types'
import { scheduleReminder, cancelReminder, buildNextOccurrence } from '../notifications/notificationService'

export function useReminders() {
  const reminders = useLiveQuery(() => db.reminders.orderBy('scheduledAt').toArray())

  async function addReminder(reminder: Omit<Reminder, 'id' | 'capacitorNotificationId' | 'createdAt'>) {
    const notifId = await scheduleReminder({
      ...reminder,
      capacitorNotificationId: 0,
      id: undefined,
      createdAt: '',
    })
    // notifId === -1 means notification scheduling failed (e.g. permission denied).
    // Still save the reminder to DB so the user's data is not lost.
    // The notification simply won't fire until they grant permission.
    await db.reminders.add({
      ...reminder,
      capacitorNotificationId: notifId,
      createdAt: new Date().toISOString(),
    })
  }

  async function toggleReminder(id: number, reminder: Reminder) {
    if (reminder.isActive) {
      // Pause: cancel the OS-level alarm and mark inactive
      await cancelReminder(reminder.capacitorNotificationId)
      await db.reminders.update(id, { isActive: false })
    } else {
      // Re-enable: ALWAYS recalculate the next future occurrence from stored HH:MM
      // (the stored scheduledAt may be days/weeks in the past — never pass past dates
      //  to Capacitor or it fires immediately)
      const orig = new Date(reminder.scheduledAt)
      const timeHHMM = `${String(orig.getHours()).padStart(2,'0')}:${String(orig.getMinutes()).padStart(2,'0')}`
      const nextDate = buildNextOccurrence(timeHHMM)
      const freshScheduledAt = nextDate.toISOString()

      const updatedReminder: Reminder = {
        ...reminder,
        isActive: true,
        scheduledAt: freshScheduledAt,
      }
      const notifId = await scheduleReminder(updatedReminder)
      await db.reminders.update(id, {
        isActive: true,
        capacitorNotificationId: notifId,
        scheduledAt: freshScheduledAt,  // keep DB in sync with what was actually scheduled
      })
    }
  }

  async function deleteReminder(id: number, capacitorNotificationId: number) {
    await cancelReminder(capacitorNotificationId)
    await db.reminders.delete(id)
  }

  async function updateReminder(
    id: number,
    old: Reminder,
    updates: Omit<Reminder, 'id' | 'capacitorNotificationId' | 'createdAt'>
  ) {
    await cancelReminder(old.capacitorNotificationId)
    const notifId = await scheduleReminder({
      ...updates,
      capacitorNotificationId: 0,
      id: undefined,
      createdAt: old.createdAt,
    })
    await db.reminders.update(id, { ...updates, capacitorNotificationId: notifId })
  }

  return { reminders, addReminder, toggleReminder, deleteReminder, updateReminder }
}

// ─── Called once on app start to clean up stale 'once' reminders ──────────────
// A 'once' reminder whose scheduledAt is in the past has already fired.
// Mark it inactive so it doesn't get re-scheduled accidentally.
export async function cleanupStaleReminders(): Promise<void> {
  try {
    const now = Date.now()
    const all = await db.reminders.toArray()
    for (const r of all) {
      if (r.isActive && r.recurrence === 'once' && new Date(r.scheduledAt).getTime() < now) {
        await db.reminders.update(r.id!, { isActive: false })
      }
    }
  } catch { /* non-critical */ }
}
