import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { getTodayISO, getLast7Days } from '../utils/dateUtils'
import type { MoodValue } from '../types'
import { MOODS } from '../utils/constants'

export function useMoodTracker() {
  const today = getTodayISO()
  const last7 = getLast7Days()

  const todayMood = useLiveQuery(() => db.moodLogs.where('date').equals(today).first(), [today])

  const allMoods = useLiveQuery(
    () => db.moodLogs.orderBy('date').reverse().toArray(),
    []
  )

  async function logMood(moodLabel: MoodValue, note = '') {
    const mood = MOODS.find(m => m.value === moodLabel)!
    const existing = await db.moodLogs.where('date').equals(today).first()
    if (existing?.id) {
      await db.moodLogs.update(existing.id, { moodLabel, moodScore: mood.score, note, loggedAt: new Date().toISOString() })
    } else {
      await db.moodLogs.add({ date: today, moodScore: mood.score, moodLabel, note, loggedAt: new Date().toISOString() })
    }
  }

  const chartData = last7.map(date => {
    const log = allMoods?.find(m => m.date === date)
    return { date: date.slice(5), score: log?.moodScore ?? null, mood: log?.moodLabel }
  })

  return { todayMood, allMoods, logMood, chartData }
}
