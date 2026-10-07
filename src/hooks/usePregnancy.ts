import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { getPregnancyWeek, getDaysUntil, getPregnancyProgress } from '../utils/dateUtils'
import { getBabySize, getTrimesterLabel } from '../utils/pregnancyUtils'

export function usePregnancy() {
  // undefined = still loading from IndexedDB; null = loaded but empty
  const profile = useLiveQuery(() => db.pregnancyProfile.toArray().then(r => r[0] ?? null))
  const isLoading = profile === undefined

  if (isLoading || !profile) {
    return { profile: null, week: 0, daysRemaining: 0, progress: 0, babySize: null, trimester: '', hasProfile: false, isLoading }
  }

  const week = getPregnancyWeek(profile.dueDate)
  const daysRemaining = Math.max(0, getDaysUntil(profile.dueDate))
  const progress = getPregnancyProgress(profile.dueDate)
  const babySize = getBabySize(week)
  const trimester = getTrimesterLabel(week)

  return { profile, week, daysRemaining, progress, babySize, trimester, hasProfile: true, isLoading: false }
}
