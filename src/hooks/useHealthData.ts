import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'
import { db } from '../db/database'
import { getTodayISO, getLast7Days } from '../utils/dateUtils'
import type { MetricType } from '../types'

export function useHealthData() {
  const today = useMemo(() => getTodayISO(), [])
  const last7 = useMemo(() => getLast7Days(), [])

  const todayMetrics = useLiveQuery(
    () => db.healthMetrics.where('date').equals(today).toArray(),
    [today]
  )

  const weekMetrics = useLiveQuery(
    () => db.healthMetrics.where('date').between(last7[0], last7[6], true, true).toArray(),
    [last7[0]]
  )

  const logMetric = useCallback(async (type: MetricType, value: number, unit: string, weekNumber = 0) => {
    const existing = await db.healthMetrics
      .where('[date+type]').equals([today, type]).first()
    if (existing?.id) {
      await db.healthMetrics.update(existing.id, { value, note: '' })
    } else {
      await db.healthMetrics.add({ date: today, type, value, unit, weekNumber, note: '' })
    }
  }, [today])

  const deleteMetric = useCallback(async (type: MetricType) => {
    const existing = await db.healthMetrics
      .where('[date+type]').equals([today, type]).first()
    if (existing?.id) await db.healthMetrics.delete(existing.id)
  }, [today])

  const getTodayValue = useCallback((type: MetricType): number => {
    return todayMetrics?.find(m => m.type === type)?.value ?? 0
  }, [todayMetrics])

  const getWeekData = useCallback((type: MetricType): { date: string; value: number }[] => {
    return last7.map(date => ({
      date,
      value: weekMetrics?.find(m => m.date === date && m.type === type)?.value ?? 0,
    }))
  }, [last7, weekMetrics])

  return { todayMetrics, weekMetrics, logMetric, deleteMetric, getTodayValue, getWeekData }
}
