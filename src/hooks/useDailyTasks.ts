import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { getTodayISO } from '../utils/dateUtils'
import { DEFAULT_DAILY_TASKS } from '../utils/constants'

// Module-level flag prevents concurrent calls to ensureTodayTasks
let _ensureRunning = false

export function useDailyTasks() {
  const today = getTodayISO()

  const tasks = useLiveQuery(
    () => db.dailyTasks.where('date').equals(today).toArray(),
    [today]
  )

  async function ensureTodayTasks() {
    if (_ensureRunning) return
    _ensureRunning = true
    try {
      const count = await db.dailyTasks.where('date').equals(today).count()
      if (count > 0) return

      // Find the most recent past day that had tasks — not just yesterday.
      // This ensures the routine is preserved even if the user skips days.
      const allPrev = await db.dailyTasks.where('date').below(today).toArray()
      if (allPrev.length === 0) {
        // Fresh install — seed starter routine from defaults
        await db.dailyTasks.bulkAdd(
          DEFAULT_DAILY_TASKS.map(t => ({
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
        )
        return
      }

      const latestDate = allPrev.reduce((max, t) => (t.date > max ? t.date : max), '')
      const template = allPrev.filter(t => t.date === latestDate)

      await db.dailyTasks.bulkAdd(
        template.map(t => ({
          date: today,
          taskKey: t.taskKey,
          label: t.label,
          emoji: t.emoji,
          isCompleted: false,
          category: t.category,
          completedAt: '',
          targetCount: t.targetCount ?? 1,
          completedCount: 0,
        }))
      )
    } finally {
      _ensureRunning = false
    }
  }

  async function toggleTask(id: number, isCompleted: boolean) {
    const task = await db.dailyTasks.get(id)
    const target = task?.targetCount ?? 1
    await db.dailyTasks.update(id, {
      isCompleted,
      completedCount: isCompleted ? target : 0,
      completedAt: isCompleted ? new Date().toISOString() : '',
    })
  }

  /** Increment completedCount by 1; marks complete when count reaches target */
  async function incrementTask(id: number) {
    const task = await db.dailyTasks.get(id)
    if (!task) return
    const target = task.targetCount ?? 1
    const newCount = Math.min((task.completedCount ?? 0) + 1, target)
    const isCompleted = newCount >= target
    await db.dailyTasks.update(id, {
      completedCount: newCount,
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : (task.completedAt ?? ''),
    })
  }

  /** Decrement completedCount by 1; marks task incomplete */
  async function decrementTask(id: number) {
    const task = await db.dailyTasks.get(id)
    if (!task) return
    const newCount = Math.max((task.completedCount ?? 0) - 1, 0)
    await db.dailyTasks.update(id, {
      completedCount: newCount,
      isCompleted: false,
      completedAt: '',
    })
  }

  async function addCustomTask(label: string, emoji: string, targetCount = 1) {
    await db.dailyTasks.add({
      date: today,
      taskKey: `custom_${Date.now()}`,
      label,
      emoji,
      isCompleted: false,
      category: 'Custom',
      completedAt: '',
      targetCount: Math.max(1, targetCount),
      completedCount: 0,
    })
  }

  async function deleteTask(id: number) {
    await db.dailyTasks.delete(id)
  }

  async function updateTask(id: number, label: string, emoji: string, targetCount: number) {
    await db.dailyTasks.update(id, { label, emoji, targetCount: Math.max(1, targetCount) })
  }

  const completedCount = tasks?.filter(t => t.isCompleted).length ?? 0
  const totalCount = tasks?.length ?? 0
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return {
    tasks,
    completedCount,
    totalCount,
    progress,
    toggleTask,
    incrementTask,
    decrementTask,
    addCustomTask,
    deleteTask,
    updateTask,
    ensureTodayTasks,
  }
}
