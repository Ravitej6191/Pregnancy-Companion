import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { sendImmediateNotification } from '../notifications/notificationService'
import { useToast } from '../components/ui/Toast'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { db } from '../db/database'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { usePregnancy } from '../hooks/usePregnancy'
import { getTodayISO, getPregnancyWeek, formatTimestampFull } from '../utils/dateUtils'

export function KickCounterPage() {
  const { profile } = usePregnancy()
  const { show } = useToast()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const todayKicks = useLiveQuery(
    () => db.kickSessions.where('date').equals(getTodayISO()).toArray()
  ) ?? []

  const totalKicks = todayKicks.reduce((sum, s) => sum + s.kickCount, 0)

  const kick10Notified = useRef(false)
  useEffect(() => {
    if (!kick10Notified.current && totalKicks >= 10) {
      kick10Notified.current = true
      sendImmediateNotification('Baby is active!', `You counted ${totalKicks} kicks today. Your baby is doing great!`)
    }
    // Reset if kicks cleared
    if (totalKicks === 0) kick10Notified.current = false
  }, [totalKicks])

  async function recordKick() {
    await hapticLight()
    try {
      const now = Date.now()
      const week = profile?.dueDate ? getPregnancyWeek(profile.dueDate) : 0
      await db.kickSessions.add({
        date: getTodayISO(),
        startTime: now,
        endTime: now,
        kickCount: 1,
        durationSeconds: 0,
        weekNumber: week,
        notes: '',
      })
    } catch {
      show('Could not record kick. Try again.', 'error')
    }
  }

  async function deleteKick(id: number) {
    await hapticLight()
    try {
      await db.kickSessions.delete(id)
      show('Kick removed', 'info')
    } catch {
      show('Could not remove kick.', 'error')
    }
  }

  async function clearAllKicks() {
    await hapticMedium()
    try {
      const ids = todayKicks
        .map(k => k.id)
        .filter((id): id is number => id !== undefined)
      if (ids.length > 0) {
        await db.kickSessions.bulkDelete(ids)
        show('All kicks cleared', 'info')
      }
    } catch {
      show('Could not clear kicks.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Kick Counter" />
      <div className="px-5 space-y-4 pb-8">

        {/* Main card */}
        <Card gradient className="text-center py-10">
          <motion.p
            key={totalKicks}
            initial={{ scale: 1.3, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-bold text-brand-text mb-1"
          >
            {totalKicks}
          </motion.p>
          <p className="text-sm text-brand-text/50 mb-10">kicks today</p>

          <div className="relative mx-auto w-40 h-40">
            {/* Pulse ring */}
            {totalKicks > 0 && (
              <motion.div
                className="absolute inset-0 rounded-full bg-brand-primary/30"
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            )}
            <motion.button
              onClick={recordKick}
              whileTap={{ scale: 0.9 }}
              aria-label="Record a kick"
              className="relative w-40 h-40 rounded-full bg-brand-primary text-white text-6xl flex items-center justify-center cursor-pointer select-none shadow-soft"
            >
              👶
            </motion.button>
          </div>

          <p className="text-xs text-brand-text/40 mt-8">Tap to record a kick</p>
        </Card>

        {/* Clear All confirmation */}
        <AnimatePresence>
          {showClearConfirm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl bg-white border border-brand-secondary/40 shadow-soft p-5"
            >
              <p className="font-bold text-brand-text text-sm mb-1">Clear all kicks for today?</p>
              <p className="text-xs text-brand-text/50 mb-4">This will remove all recorded kicks for today.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-brand-secondary/40 text-sm font-semibold text-brand-text/70"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowClearConfirm(false); clearAllKicks() }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's timeline */}
        <AnimatePresence>
          {todayKicks.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-brand-text text-sm">Today's kicks</p>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-400 text-xs font-semibold"
                  >
                    <Trash2 size={12} />
                    Clear All
                  </motion.button>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {[...todayKicks].reverse().map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-brand-secondary/20 last:border-0">
                      <span className="text-xs text-brand-text/50">Kick #{todayKicks.length - i}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-brand-text">
                          {formatTimestampFull(s.startTime)}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => s.id !== undefined && deleteKick(s.id)}
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-brand-text/20 active:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
