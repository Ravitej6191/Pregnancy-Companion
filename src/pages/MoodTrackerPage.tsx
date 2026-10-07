import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save } from 'lucide-react'
import { useMoodTracker } from '../hooks/useMoodTracker'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { MOODS } from '../utils/constants'
import { formatDateTimeShort, formatDateTime } from '../utils/dateUtils'
import { useToast } from '../components/ui/Toast'
import type { MoodValue } from '../types'

export function MoodTrackerPage() {
  const { todayMood, allMoods, logMood } = useMoodTracker()
  const { show } = useToast()
  const [selected, setSelected] = useState<MoodValue | null>(todayMood?.moodLabel ?? null)
  const [remarks, setRemarks] = useState(todayMood?.note ?? '')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!selected) return
    try {
      await logMood(selected, remarks)
      setSaved(true)
      show('Mood saved!', 'success')
      setTimeout(() => setSaved(false), 1500)
    } catch {
      show('Could not save mood. Try again.', 'error')
    }
  }

  const savedMood = MOODS.find(m => m.value === todayMood?.moodLabel)
  const loggedAt = todayMood?.loggedAt ? formatDateTimeShort(todayMood.loggedAt) : null

  // All records newest-first (including today so user sees their log immediately)
  const today = new Date().toISOString().slice(0, 10)
  const allMoodsSorted = [...(allMoods ?? [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Mood Tracker" />
      <div className="px-5 space-y-4 pb-8">

        {/* Today's logged mood */}
        {savedMood && (
          <Card className="bg-brand-secondary/30">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{savedMood.emoji}</span>
              <div>
                <p className="font-bold text-brand-text text-sm">{savedMood.label}</p>
                {loggedAt && <p className="text-xs text-brand-text/40 mt-0.5">Logged {loggedAt}</p>}
                {todayMood?.note && <p className="text-xs text-brand-text/60 mt-0.5 italic">"{todayMood.note}"</p>}
              </div>
            </div>
          </Card>
        )}

        {/* Mood picker */}
        <Card gradient>
          <p className="font-bold text-brand-text mb-1 text-sm">How are you feeling?</p>
          <p className="text-xs text-brand-text/40 mb-4">Select your mood, add a note, then save</p>
          <div className="flex justify-between gap-1.5">
            {MOODS.map(mood => (
              <motion.button
                key={mood.value}
                whileTap={{ scale: 0.85 }}
                onClick={() => { setSelected(mood.value as MoodValue); setSaved(false) }}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                  selected === mood.value
                    ? 'ring-2 ring-brand-primary bg-brand-secondary/40 scale-105'
                    : 'bg-white/60'
                }`}
              >
                <span className="text-2xl">{mood.emoji}</span>
                <span className="text-[9px] font-semibold text-brand-text/50 leading-tight text-center">{mood.label}</span>
              </motion.button>
            ))}
          </div>
        </Card>

        {/* Mood Notes + Save — only shown after picking */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-3"
            >
              <Card>
                <label className="block text-xs font-bold text-brand-text/50 uppercase tracking-wide mb-2">
                  Mood Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="How are you feeling today? Any symptoms or thoughts..."
                  rows={3}
                  className="w-full text-sm text-brand-text bg-brand-bg rounded-xl p-3 resize-none outline-none placeholder:text-brand-text/30 border border-brand-secondary/40 focus:border-brand-primary/50 transition-colors"
                />
              </Card>

              <Button fullWidth onClick={handleSave} disabled={saved}>
                <Save size={16} className="inline mr-2" />
                {saved ? 'Saved!' : 'Save Mood'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Affirmation */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
          <p className="text-sm text-brand-text/70 leading-relaxed text-center">
            Whatever you feel today is valid. Growing a baby is hard work — be gentle with yourself.
          </p>
        </Card>

        {/* All mood history — newest first, includes today */}
        <Card>
          <p className="font-bold text-brand-text text-sm mb-3">History</p>
          {allMoods === undefined ? (
            <p className="text-xs text-brand-text/40 text-center py-3">Loading...</p>
          ) : allMoodsSorted.length === 0 ? (
            <p className="text-xs text-brand-text/40 text-center py-3">No records yet — save your first mood above.</p>
          ) : (
            <div className="space-y-0">
              {allMoodsSorted.map(log => {
                const mood = MOODS.find(m => m.value === log.moodLabel)
                const isToday = log.date === today
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2.5 border-b border-brand-secondary/20 last:border-0"
                  >
                    <span className="text-2xl flex-shrink-0">{mood?.emoji ?? '😐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-brand-text">{mood?.label ?? log.moodLabel}</p>
                        {isToday && (
                          <span className="text-[9px] font-bold bg-brand-primary/15 text-brand-primary px-1.5 py-0.5 rounded-full">Today</span>
                        )}
                      </div>
                      {log.note ? (
                        <p className="text-xs text-brand-text/50 italic truncate">"{log.note}"</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-brand-text/30 flex-shrink-0 text-right">
                      {log.loggedAt ? formatDateTime(log.loggedAt) : formatDateTimeShort(log.date + 'T00:00:00')}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
