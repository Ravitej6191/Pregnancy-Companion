import { useState, useRef, useCallback, useEffect } from 'react'
import { db } from '../db/database'
import { getTodayISO } from '../utils/dateUtils'
import { getPregnancyWeek } from '../utils/dateUtils'

type SessionState = 'idle' | 'active' | 'completed'

export function useKickCounter(dueDate?: string) {
  const [state, setState] = useState<SessionState>('idle')
  const [kicks, setKicks] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Keep a ref in sync with kicks so endSession always reads the latest value
  const kicksRef = useRef(0)

  const startSession = useCallback(() => {
    startTimeRef.current = Date.now()
    kicksRef.current = 0
    setKicks(0)
    setElapsed(0)
    setState('active')
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])

  const addKick = useCallback(() => {
    if (state !== 'active') return
    kicksRef.current += 1
    setKicks(k => k + 1)
  }, [state])

  const endSession = useCallback(async (notes = '') => {
    if (state !== 'active') return
    if (intervalRef.current) clearInterval(intervalRef.current)
    const endTime = Date.now()
    const duration = Math.floor((endTime - startTimeRef.current) / 1000)
    setState('completed')

    const week = dueDate ? getPregnancyWeek(dueDate) : 0
    await db.kickSessions.add({
      date: getTodayISO(),
      startTime: startTimeRef.current,
      endTime,
      kickCount: kicksRef.current,
      durationSeconds: duration,
      weekNumber: week,
      notes,
    })
  }, [state, dueDate])

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setState('idle')
    setKicks(0)
    setElapsed(0)
  }, [])

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  return { state, kicks, elapsed, startSession, addKick, endSession, reset }
}
