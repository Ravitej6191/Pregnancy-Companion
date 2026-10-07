import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { hapticLight, hapticSuccess } from '../utils/haptics'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Phase {
  label: string
  duration: number
  instruction: string
}

interface Technique {
  id: string
  name: string
  subtitle: string
  emoji: string
  color: string
  glowColor: string
  phases: Phase[]
  benefit: string
}

// ─── Techniques ───────────────────────────────────────────────────────────────

const TECHNIQUES: Technique[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    subtitle: '4 · 4 · 4 · 4',
    emoji: '🔷',
    color: '#818CF8',
    glowColor: '#818CF820',
    benefit: 'Reduces stress & improves focus',
    phases: [
      { label: 'Inhale', duration: 4, instruction: 'Breathe in slowly through your nose' },
      { label: 'Hold',   duration: 4, instruction: 'Hold your breath gently' },
      { label: 'Exhale', duration: 4, instruction: 'Breathe out slowly through your mouth' },
      { label: 'Hold',   duration: 4, instruction: 'Rest before the next breath' },
    ],
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    subtitle: '4 · 7 · 8',
    emoji: '🌙',
    color: '#A78BFA',
    glowColor: '#A78BFA20',
    benefit: 'Calms nerves & promotes sleep',
    phases: [
      { label: 'Inhale', duration: 4,  instruction: 'Breathe in quietly through your nose' },
      { label: 'Hold',   duration: 7,  instruction: 'Hold your breath completely' },
      { label: 'Exhale', duration: 8,  instruction: 'Exhale fully through your mouth' },
    ],
  },
  {
    id: 'belly',
    name: 'Belly Breathing',
    subtitle: '4 · 6',
    emoji: '🌸',
    color: '#F472B6',
    glowColor: '#F472B620',
    benefit: 'Eases discomfort & oxygenates baby',
    phases: [
      { label: 'Inhale', duration: 4, instruction: 'Let your belly rise as you breathe in' },
      { label: 'Exhale', duration: 6, instruction: 'Let your belly fall, breathe out fully' },
    ],
  },
]

const CYCLE_TARGET = 5
const CIRCLE_MIN = 120   // px — fully exhaled
const CIRCLE_MAX = 192   // px — fully inhaled

// ─── Helper: get the circle start/end size for a given phase ─────────────────
// Inhale  → grow from min to max
// Exhale  → shrink from max to min
// Hold    → stay at whatever size the previous phase left off
function getCircleAnim(phases: Phase[], idx: number): { from: number; to: number } {
  const label = phases[idx].label
  if (label === 'Inhale') return { from: CIRCLE_MIN, to: CIRCLE_MAX }
  if (label === 'Exhale') return { from: CIRCLE_MAX, to: CIRCLE_MIN }
  // Hold — look backward for the last directional phase
  for (let i = idx - 1; i >= 0; i--) {
    if (phases[i].label === 'Inhale') return { from: CIRCLE_MAX, to: CIRCLE_MAX }
    if (phases[i].label === 'Exhale') return { from: CIRCLE_MIN, to: CIRCLE_MIN }
  }
  return { from: CIRCLE_MIN, to: CIRCLE_MIN }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BreathingExercisePage() {
  const [selected, setSelected]     = useState<Technique>(TECHNIQUES[0])
  const [running, setRunning]       = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [countdown, setCountdown]   = useState(0)   // seconds left in phase
  const [cycles, setCycles]         = useState(0)
  const [sessionSecs, setSessionSecs] = useState(0)
  const [finished, setFinished]     = useState(false)

  const tickRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const phase = selected.phases[phaseIndex]
  const anim  = getCircleAnim(selected.phases, phaseIndex)

  // ── Main tick — counts down each phase ──────────────────────────────────────
  useEffect(() => {
    if (!running) return

    // Initialise countdown for this phase
    setCountdown(phase.duration)

    tickRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Phase done — advance
          clearInterval(tickRef.current!)
          hapticLight()

          const nextIdx = phaseIndex + 1
          if (nextIdx >= selected.phases.length) {
            // Cycle complete
            setCycles(c => {
              const newC = c + 1
              if (newC >= CYCLE_TARGET) {
                setRunning(false)
                setFinished(true)
                hapticSuccess()
              } else {
                setPhaseIndex(0)
              }
              return newC
            })
          } else {
            setPhaseIndex(nextIdx)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIndex])

  // ── Session clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      sessionRef.current = setInterval(() => setSessionSecs(s => s + 1), 1000)
    } else {
      if (sessionRef.current) clearInterval(sessionRef.current)
    }
    return () => { if (sessionRef.current) clearInterval(sessionRef.current) }
  }, [running])

  // ── Cleanup on unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tickRef.current)    clearInterval(tickRef.current)
      if (sessionRef.current) clearInterval(sessionRef.current)
    }
  }, [])

  function handleStart() {
    setCycles(0)
    setPhaseIndex(0)
    setSessionSecs(0)
    setFinished(false)
    setRunning(true)
    hapticLight()
  }

  function handleStop() {
    setRunning(false)
    setPhaseIndex(0)
    setCountdown(0)
    setFinished(false)
  }

  function selectTechnique(t: Technique) {
    if (running) return
    setSelected(t)
    setFinished(false)
    setCycles(0)
    setPhaseIndex(0)
    setCountdown(0)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Breathing Exercise" />

      <div className="px-5 space-y-4 pb-10">

        {/* ── Technique picker (only when idle) ────────────────────────── */}
        {!running && !finished && (
          <div className="space-y-2">
            {TECHNIQUES.map(t => (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectTechnique(t)}
                className={`w-full text-left rounded-2xl p-4 transition-all border-2 shadow-card ${
                  selected.id === t.id
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-transparent bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-brand-text text-sm">{t.name}</p>
                    <p className="text-xs text-brand-text/50">{t.subtitle} · {t.benefit}</p>
                  </div>
                  {selected.id === t.id && (
                    <div className="w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* ── Completion screen ─────────────────────────────────────────── */}
        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl bg-gradient-to-br from-brand-primary to-pink-400 p-8 text-center shadow-soft"
            >
              <p className="text-5xl mb-3">🌸</p>
              <p className="text-white font-bold text-xl mb-1">Well done, Mama!</p>
              <p className="text-white/80 text-sm mb-1">{CYCLE_TARGET} cycles · {selected.name}</p>
              <p className="text-white/60 text-xs mb-6">Session: {formatTime(sessionSecs)}</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                className="w-full py-3 rounded-2xl bg-white text-brand-primary font-bold text-sm mb-2"
              >
                Do Another Round
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleStop}
                className="w-full py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm"
              >
                Done
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Breathing circle + controls ───────────────────────────────── */}
        {!finished && (
          <div className="flex flex-col items-center py-4 gap-6">

            {/* Circle */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: CIRCLE_MAX + 40, height: CIRCLE_MAX + 40 }}
            >
              {/* Soft glow behind the circle */}
              <motion.div
                key={`glow-${phaseIndex}`}
                className="absolute rounded-full"
                style={{ background: selected.glowColor }}
                initial={{ width: anim.from + 32, height: anim.from + 32, opacity: 0.6 }}
                animate={{ width: anim.to + 32,   height: anim.to + 32,   opacity: running ? 1 : 0.4 }}
                transition={{ duration: running ? phase.duration : 0.4, ease: 'easeInOut' }}
              />

              {/* Main circle — key changes on every phase so animation restarts cleanly */}
              <motion.div
                key={`circle-${phaseIndex}-${running ? 'run' : 'idle'}`}
                className="rounded-full flex flex-col items-center justify-center shadow-lg absolute"
                style={{
                  background: `radial-gradient(circle at 38% 38%, ${selected.color}55, ${selected.color}22)`,
                  border: `3px solid ${selected.color}60`,
                }}
                initial={{ width: running ? anim.from : CIRCLE_MIN + 20, height: running ? anim.from : CIRCLE_MIN + 20 }}
                animate={{ width: running ? anim.to   : CIRCLE_MIN + 20, height: running ? anim.to   : CIRCLE_MIN + 20 }}
                transition={{ duration: running ? phase.duration : 0.4, ease: 'easeInOut' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={running ? `${phaseIndex}` : 'idle'}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center gap-0.5"
                  >
                    {running ? (
                      <>
                        <p className="font-bold text-base" style={{ color: selected.color }}>
                          {phase.label}
                        </p>
                        <p className="text-3xl font-bold text-brand-text/80 leading-none">
                          {countdown}
                        </p>
                      </>
                    ) : (
                      <p className="text-4xl">{selected.emoji}</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Phase instruction */}
            <AnimatePresence mode="wait">
              {running && (
                <motion.p
                  key={phaseIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-brand-text/55 text-center px-8 min-h-[20px]"
                >
                  {phase.instruction}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Cycle dots */}
            {running && (
              <div className="flex gap-2">
                {Array.from({ length: CYCLE_TARGET }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 8, height: 8,
                      background: i < cycles ? selected.color : `${selected.color}30`,
                    }}
                    animate={{ scale: i === cycles ? [1, 1.4, 1] : 1 }}
                    transition={{ duration: 0.35 }}
                  />
                ))}
              </div>
            )}

            {/* Session clock */}
            {running && (
              <p className="text-xs text-brand-text/35">{formatTime(sessionSecs)} elapsed</p>
            )}

            {/* Start / Stop */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={running ? handleStop : handleStart}
              className={`px-14 py-4 rounded-2xl font-bold text-base shadow-soft ${
                running
                  ? 'bg-white border-2 border-red-200 text-red-400'
                  : 'text-white'
              }`}
              style={running ? {} : {
                background: `linear-gradient(135deg, ${selected.color}, ${selected.color}BB)`,
              }}
            >
              {running ? 'Stop' : `Start · ${CYCLE_TARGET} cycles`}
            </motion.button>
          </div>
        )}

        {/* ── Tips (only when idle) ─────────────────────────────────────── */}
        {!running && !finished && (
          <Card>
            <p className="font-bold text-brand-text text-sm mb-3">Tips for Best Results</p>
            <div className="space-y-2.5">
              {[
                ['🪑', 'Sit comfortably or lie on your left side'],
                ['👃', 'Breathe through your nose when inhaling'],
                ['😮', 'Exhale slowly and fully through your mouth'],
                ['🤲', 'Place one hand on your belly to feel it rise'],
                ['🔇', 'Find a quiet, calm space before you begin'],
              ].map(([icon, tip], i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-sm leading-relaxed">{icon}</span>
                  <p className="text-xs text-brand-text/60 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
