import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db/database'
import { getTodayISO } from '../utils/dateUtils'
import type { Contraction } from '../types'

type ContractionState = 'idle' | 'contracting' | 'resting'

export function useContractionTimer() {
  const [state, setState] = useState<ContractionState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [restElapsed, setRestElapsed] = useState(0)
  const [contractions, setContractions] = useState<Contraction[]>([])
  const sessionIdRef = useRef<string>(uuidv4())
  const startTimeRef = useRef<number>(0)
  const lastEndRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAllIntervals = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (restIntervalRef.current) clearInterval(restIntervalRef.current)
  }, [])

  const startContraction = useCallback(() => {
    clearAllIntervals()
    if (state === 'idle') sessionIdRef.current = uuidv4()
    startTimeRef.current = Date.now()
    setState('contracting')
    setElapsed(0)
    setRestElapsed(0)
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [state, clearAllIntervals])

  const stopContraction = useCallback(async () => {
    if (state !== 'contracting') return
    if (intervalRef.current) clearInterval(intervalRef.current)
    const endTime = Date.now()
    const duration = Math.floor((endTime - startTimeRef.current) / 1000)
    const interval = lastEndRef.current > 0
      ? Math.floor((startTimeRef.current - lastEndRef.current) / 1000)
      : 0
    lastEndRef.current = endTime
    setState('resting')
    setElapsed(0)
    setRestElapsed(0)

    const restStart = Date.now()
    restIntervalRef.current = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restStart) / 1000))
    }, 1000)

    const newContraction: Contraction = {
      sessionId: sessionIdRef.current,
      startTime: startTimeRef.current,
      endTime,
      duration,
      intervalFromPrevious: interval,
      date: getTodayISO(),
    }
    const id = await db.contractions.add(newContraction)
    setContractions(prev => [{ ...newContraction, id: id as number }, ...prev])
  }, [state])

  const clearSession = useCallback(() => {
    clearAllIntervals()
    setState('idle')
    setElapsed(0)
    setRestElapsed(0)
    setContractions([])
    lastEndRef.current = 0
    sessionIdRef.current = uuidv4()
  }, [clearAllIntervals])

  useEffect(() => () => clearAllIntervals(), [clearAllIntervals])

  const avgDuration = contractions.length > 0
    ? Math.round(contractions.reduce((s, c) => s + c.duration, 0) / contractions.length)
    : 0

  const withInterval = contractions.filter(c => c.intervalFromPrevious > 0)
  const avgInterval = withInterval.length > 0
    ? Math.round(withInterval.reduce((s, c) => s + c.intervalFromPrevious, 0) / withInterval.length)
    : 0

  return { state, elapsed, restElapsed, contractions, startContraction, stopContraction, clearSession, avgDuration, avgInterval }
}
