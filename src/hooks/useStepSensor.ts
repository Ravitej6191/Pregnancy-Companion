import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Detects steps from the phone's accelerometer via DeviceMotionEvent.
 * Works in Capacitor Android WebView without any extra plugins or permissions.
 *
 * Algorithm: peak detection on acceleration magnitude (including gravity).
 *  - Step counted when magnitude rises above HIGH_THRESHOLD (peak of stride)
 *    then drops below LOW_THRESHOLD (trough), with a min gap between steps.
 */

const HIGH_THRESHOLD = 11.8   // m/s² — peak of walking stride
const LOW_THRESHOLD  = 9.2    // m/s² — trough after stride
const MIN_STEP_GAP_MS = 350   // fastest realistic cadence ~170 steps/min

export interface StepSensorState {
  sessionSteps: number    // steps counted since mount / last reset
  isAvailable: boolean    // true once first DeviceMotionEvent arrives
  resetSession: () => void
}

export function useStepSensor(): StepSensorState {
  const [sessionSteps, setSessionSteps] = useState(0)
  const [isAvailable, setIsAvailable] = useState(false)

  const above      = useRef(false)
  const lastStepTs = useRef(0)
  const stepCount  = useRef(0)
  const detected   = useRef(false)

  useEffect(() => {
    function handleMotion(e: DeviceMotionEvent) {
      const acc = e.accelerationIncludingGravity
      if (!acc || (acc.x === null && acc.y === null && acc.z === null)) return

      if (!detected.current) {
        detected.current = true
        setIsAvailable(true)
      }

      const x = acc.x ?? 0
      const y = acc.y ?? 0
      const z = acc.z ?? 0
      const mag = Math.sqrt(x * x + y * y + z * z)
      const now = Date.now()

      if (!above.current && mag > HIGH_THRESHOLD) {
        above.current = true
      } else if (above.current && mag < LOW_THRESHOLD) {
        above.current = false
        if (now - lastStepTs.current >= MIN_STEP_GAP_MS) {
          lastStepTs.current = now
          stepCount.current += 1
          setSessionSteps(stepCount.current)
        }
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [])

  const resetSession = useCallback(() => {
    stepCount.current = 0
    above.current = false
    lastStepTs.current = 0
    setSessionSteps(0)
  }, [])

  return { sessionSteps, isAvailable, resetSession }
}
