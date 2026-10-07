import { LocalNotifications } from '@capacitor/local-notifications'
import type { Reminder } from '../types'

const CHANNEL_ID = 'katyamma_care'

// ─── Stable monotonically-increasing IDs (never random, never collide) ────────
// Scheduled reminders: 10_000 – 1_999_999_999
// Immediate toasts:    2_000_000_000 – 2_147_483_646
const SCHED_KEY = '_kc_notif_sched_id'
const IMM_KEY   = '_kc_notif_imm_id'

function nextSchedId(): number {
  const cur = parseInt(localStorage.getItem(SCHED_KEY) || '10000', 10)
  const next = cur >= 1_999_999_999 ? 10000 : cur + 1
  localStorage.setItem(SCHED_KEY, String(next))
  return next
}

function nextImmId(): number {
  const cur = parseInt(localStorage.getItem(IMM_KEY) || '2000000000', 10)
  const next = cur >= 2_147_483_646 ? 2_000_000_000 : cur + 1
  localStorage.setItem(IMM_KEY, String(next))
  return next
}

// ─── Build the next future Date for a given "HH:MM" time string ───────────────
export function buildNextOccurrence(timeHHMM: string): Date {
  const [h, m] = timeHHMM.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  // If this time has already passed today → push to tomorrow
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

// ─── Channel setup (Android 8+) ───────────────────────────────────────────────
async function ensureChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Katyamma Care',
      description: 'Pregnancy care reminders and alerts',
      importance: 5,       // IMPORTANCE_HIGH
      visibility: 1,       // VISIBILITY_PUBLIC
      sound: 'default',
      vibration: true,
    })
  } catch { /* channel may already exist */ }
}

// ─── Permission ───────────────────────────────────────────────────────────────

/** Returns current notification permission state without prompting. */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await LocalNotifications.checkPermissions()
    if (result.display === 'granted') return 'granted'
    if (result.display === 'denied') return 'denied'
    return 'prompt'
  } catch {
    return 'prompt'
  }
}

/**
 * Requests notification permission.
 * - If already granted, returns true immediately (no dialog shown — correct behaviour).
 * - If denied, returns false (user must go to Settings to re-enable).
 * - If prompt state, shows the system dialog.
 * NOTE: ensureChannel() is called AFTER requestPermissions so that the channel
 * creation does NOT consume the one-time system dialog prematurely.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await LocalNotifications.checkPermissions()

    if (current.display === 'granted') {
      await ensureChannel()
      return true
    }

    if (current.display === 'denied') {
      return false
    }

    // 'prompt' — show system dialog first, then create channel
    const result = await LocalNotifications.requestPermissions()
    if (result.display === 'granted') {
      await ensureChannel()
      return true
    }
    return false
  } catch {
    return false
  }
}

// ─── Schedule a reminder ──────────────────────────────────────────────────────
export async function scheduleReminder(reminder: Reminder): Promise<number> {
  try {
    await ensureChannel()
    const notifId = nextSchedId()
    const scheduledAt = new Date(reminder.scheduledAt)

    // Safety: if scheduledAt is in the past (can happen with stale data),
    // rebuild it using the same HH:MM so it fires at the next valid future time
    const safeAt = scheduledAt.getTime() <= Date.now()
      ? buildNextOccurrence(
          `${String(scheduledAt.getHours()).padStart(2,'0')}:${String(scheduledAt.getMinutes()).padStart(2,'0')}`
        )
      : scheduledAt

    const isRepeating = reminder.recurrence !== 'once'

    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: reminder.title,
        body: reminder.body || reminder.title,
        schedule: {
          at: safeAt,
          allowWhileIdle: true,  // fires even when Android is in Doze mode
          ...(isRepeating
            ? {
                repeats: true,
                every: reminder.recurrence === 'daily'   ? 'day'
                     : reminder.recurrence === 'monthly' ? 'month'
                     : 'week',
              }
            : {}
          ),
        },
        sound: 'default',
        channelId: CHANNEL_ID,
        actionTypeId: '',
        attachments: undefined,
        extra: null,
      }]
    })

    return notifId
  } catch {
    return -1
  }
}

// ─── Cancel a single reminder ─────────────────────────────────────────────────
export async function cancelReminder(capacitorNotificationId: number): Promise<void> {
  if (capacitorNotificationId <= 0) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: capacitorNotificationId }] })
  } catch { }
}

// ─── Cancel ALL pending notifications (useful on full reset) ──────────────────
export async function cancelAllReminders(): Promise<void> {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  } catch { }
}

// ─── Immediate one-shot notification (e.g. "goal reached") ───────────────────
export async function sendImmediateNotification(title: string, body: string): Promise<void> {
  try {
    await ensureChannel()
    await LocalNotifications.schedule({
      notifications: [{
        id: nextImmId(),          // uses a completely separate ID range — never collides
        title,
        body,
        schedule: {
          at: new Date(Date.now() + 1000),  // 1 second from now
          allowWhileIdle: true,
        },
        sound: 'default',
        channelId: CHANNEL_ID,
        attachments: undefined,
        actionTypeId: '',
        extra: null,
      }]
    })
  } catch { }
}
