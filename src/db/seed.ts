import { db } from './database'
import { DEFAULT_CHECKLIST_ITEMS, DEFAULT_DAILY_TASKS } from '../utils/constants'
import { getTodayISO } from '../utils/dateUtils'

export async function seedDatabase() {
  // Seed if there are no default (non-custom) items — covers fresh install AND
  // the case where the user reset the app and the DB was wiped.
  const defaultCount = await db.checklistItems.filter(i => !i.isCustom).count()
  if (defaultCount === 0) {
    const now = new Date().toISOString()
    const items = DEFAULT_CHECKLIST_ITEMS.map((item, i) => ({
      ...item,
      sortOrder: i,
      isCustom: false,
      createdAt: now,
      // Epoch timestamp: untouched seeds must never win a sync merge against a
      // checklist the user already ticked on another device.
      updatedAt: new Date(0).toISOString(),
    }))
    await db.checklistItems.bulkAdd(items)
  }
}

export async function seedDailyTasks() {
  const today = getTodayISO()
  const existing = await db.dailyTasks.where('date').equals(today).count()
  if (existing === 0) {
    const tasks = DEFAULT_DAILY_TASKS.map(t => ({
      date: today,
      taskKey: t.taskKey,
      label: t.label,
      emoji: t.emoji,
      isCompleted: false,
      category: t.category,
      completedAt: '',
      targetCount: 1,
      completedCount: 0,
    }))
    await db.dailyTasks.bulkAdd(tasks)
  }
}
