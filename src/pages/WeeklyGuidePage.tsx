import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Baby, Heart, Lightbulb, Leaf, Dumbbell, Loader2, RefreshCw, Scale, Ruler } from 'lucide-react'
import { usePregnancy } from '../hooks/usePregnancy'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import type { WeekGuide } from '../types'

function formatWeight(g: number): string {
  if (g < 1) return '< 1 g'
  if (g < 1000) return `${g} g`
  return `${(g / 1000).toFixed(2).replace(/\.?0+$/, '')} kg`
}

export function WeeklyGuidePage() {
  const { week } = usePregnancy()
  const [selectedWeek, setSelectedWeek] = useState(week || 1)
  const [guide, setGuide] = useState<WeekGuide[]>([])
  const [currentGuide, setCurrentGuide] = useState<WeekGuide | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [loading, setLoading] = useState(true)

  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  function loadGuide() {
    setLoadError(false)
    setLoading(true)
    fetch('/data/weekly-guide.json')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json() })
      .then(data => {
        setGuide(data.weeks)
        const found = data.weeks.find((w: WeekGuide) => w.week === selectedWeek)
        setCurrentGuide(found ?? data.weeks[0])
        setLoading(false)
      })
      .catch(() => { setLoadError(true); setLoading(false) })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadGuide() }, [])

  useEffect(() => {
    if (guide.length > 0) {
      setCurrentGuide(guide.find(w => w.week === selectedWeek) ?? null)
    }
  }, [selectedWeek, guide])

  useEffect(() => {
    if (week && week > 0) setSelectedWeek(week)
  }, [week])

  // Scroll selected week button to center of the container
  useEffect(() => {
    const btn = buttonRefs.current[selectedWeek - 1]
    const container = scrollRef.current
    if (!btn || !container) return
    const btnLeft = btn.offsetLeft
    const btnWidth = btn.offsetWidth
    const containerWidth = container.offsetWidth
    container.scrollTo({ left: btnLeft - containerWidth / 2 + btnWidth / 2, behavior: 'smooth' })
  }, [selectedWeek])

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Pregnancy Guide" showBack={false} />

      {/* Week selector — auto-centered on selected week */}
      <div className="px-5 mb-4">
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {Array.from({ length: 40 }, (_, i) => i + 1).map(w => (
            <motion.button
              key={w}
              ref={el => { buttonRefs.current[w - 1] = el }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedWeek(w)}
              className={`flex-shrink-0 w-10 h-10 rounded-2xl text-xs font-bold transition-all ${
                selectedWeek === w
                  ? 'bg-brand-primary text-white shadow-soft'
                  : w === week
                  ? 'bg-brand-secondary text-brand-primary ring-2 ring-brand-primary'
                  : 'bg-white text-brand-text/60'
              }`}
            >
              {w}
            </motion.button>
          ))}
        </div>
      </div>

      {currentGuide ? (
        <motion.div
          key={selectedWeek}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-5 space-y-4 pb-8"
        >
          {/* Header */}
          <Card gradient className="text-center py-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-text/40 mb-2">
              {currentGuide.trimester === 1 ? '1st' : currentGuide.trimester === 2 ? '2nd' : '3rd'} Trimester
            </p>
            <div className="text-5xl mb-3">{currentGuide.babySizeEmoji}</div>
            <h2 className="text-2xl font-bold text-brand-text">Week {currentGuide.week}</h2>
            <p className="text-sm text-brand-primary font-semibold mt-1 mb-3">
              Size of a {currentGuide.babySize}
            </p>

            {/* Size + Weight pills — same style */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                <Ruler size={12} className="text-brand-primary" />
                <span className="text-xs font-semibold text-brand-primary">{currentGuide.babySizeCm} cm</span>
              </div>
              {currentGuide.babyWeightG > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20">
                  <Scale size={12} className="text-brand-primary" />
                  <span className="text-xs font-semibold text-brand-primary">{formatWeight(currentGuide.babyWeightG)}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Baby development */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center">
                <Baby size={14} className="text-brand-primary" />
              </div>
              <p className="font-bold text-brand-text text-sm">Baby's Development</p>
            </div>
            <p className="text-sm text-brand-text/70 leading-relaxed">{currentGuide.babyDevelopment}</p>
          </Card>

          {/* Mom's body */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                <Heart size={14} className="text-rose-400" />
              </div>
              <p className="font-bold text-brand-text text-sm">Your Body This Week</p>
            </div>
            <p className="text-sm text-brand-text/70 leading-relaxed">{currentGuide.momBody}</p>
          </Card>

          {/* Tips */}
          <Card gradient>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <Lightbulb size={14} className="text-brand-primary" />
              </div>
              <p className="font-bold text-brand-text text-sm">Tips for Week {currentGuide.week}</p>
            </div>
            <ul className="space-y-2">
              {currentGuide.tipsForWeek.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-brand-text/70">
                  <span className="text-brand-primary font-bold mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Nutrition */}
          <Card className="bg-green-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <Leaf size={14} className="text-green-600" />
              </div>
              <p className="font-bold text-green-700 text-sm">Nutrition Tip</p>
            </div>
            <p className="text-sm text-brand-text/70 mt-1">{currentGuide.nutritionTip}</p>
          </Card>

          {/* Exercise */}
          <Card className="bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <Dumbbell size={14} className="text-blue-600" />
              </div>
              <p className="font-bold text-blue-700 text-sm">Exercise Tip</p>
            </div>
            <p className="text-sm text-brand-text/70 mt-1">{currentGuide.exerciseTip}</p>
          </Card>

          {/* Common symptoms */}
          {currentGuide.symptoms.length > 0 && (
            <Card>
              <p className="font-bold text-brand-text mb-2 text-sm">Common Symptoms</p>
              <div className="flex flex-wrap gap-2">
                {currentGuide.symptoms.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-secondary/50 text-brand-text/70">
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
          <p className="text-brand-text/50 font-semibold mb-1">Could not load guide</p>
          <p className="text-xs text-brand-text/30 mb-4">Check your connection and try again.</p>
          <button
            onClick={loadGuide}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold"
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="text-brand-primary animate-spin" />
          <p className="text-brand-text/40 text-sm">Loading guide...</p>
        </div>
      ) : null}
    </div>
  )
}
