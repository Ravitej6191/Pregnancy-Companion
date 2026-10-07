import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, Trash2, Activity, Timer, Clock, Info } from 'lucide-react'
import { sendImmediateNotification } from '../notifications/notificationService'
import { hapticLight, hapticMedium } from '../utils/haptics'
import { useContractionTimer } from '../hooks/useContractionTimer'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { formatContractionDuration } from '../utils/dateUtils'

export function ContractionTimerPage() {
  const { state, elapsed, restElapsed, contractions, startContraction, stopContraction, clearSession, avgDuration, avgInterval } = useContractionTimer()

  const hospitalAlertSent = useRef(false)
  useEffect(() => {
    if (
      !hospitalAlertSent.current &&
      contractions.length >= 3 &&
      avgInterval > 0 && avgInterval <= 300 &&  // 5 min apart
      avgDuration >= 45                           // ~60s duration
    ) {
      hospitalAlertSent.current = true
      sendImmediateNotification(
        'Time to contact your doctor!',
        'Contractions are following the 5-1-1 pattern. Please call your healthcare provider.'
      )
    }
    if (contractions.length === 0) hospitalAlertSent.current = false
  }, [contractions.length, avgInterval, avgDuration])

  const isContracting = state === 'contracting'
  const isResting = state === 'resting'

  const StateIcon = isContracting ? Activity : isResting ? Clock : Timer
  const stateIconBg = isContracting ? 'bg-rose-50' : isResting ? 'bg-indigo-50' : 'bg-brand-secondary/40'
  const stateIconColor = isContracting ? 'text-rose-500' : isResting ? 'text-indigo-400' : 'text-brand-text/40'
  const stateLabel = isContracting ? 'Contraction Active' : isResting ? 'Resting' : 'Ready to Start'
  const displaySeconds = isResting ? restElapsed : elapsed

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Contraction Timer" />
      <div className="px-5 space-y-4 pb-8">

        {/* Main timer */}
        <Card gradient className="text-center py-8">
          <div className="flex items-center justify-center mb-3">
            <div className={`w-14 h-14 rounded-2xl ${stateIconBg} flex items-center justify-center`}>
              <motion.div
                animate={isContracting ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ duration: 1.2, repeat: isContracting ? Infinity : 0 }}
              >
                <StateIcon size={26} className={stateIconColor} />
              </motion.div>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3">{stateLabel}</p>

          <div className="text-5xl font-bold text-brand-text mb-1">
            {formatContractionDuration(displaySeconds)}
          </div>
          <p className="text-sm text-brand-text/40 mb-6">
            {isContracting ? 'contraction duration' : isResting ? 'rest duration' : 'tap start when contraction begins'}
          </p>

          <div className="flex gap-3 justify-center">
            {!isContracting ? (
              <Button size="lg" onClick={() => { hapticMedium(); startContraction() }}>
                <Play size={18} className="inline mr-2" />
                {state === 'idle' ? 'Start' : 'Next Contraction'}
              </Button>
            ) : (
              <Button size="lg" variant="secondary" onClick={() => { hapticMedium(); stopContraction() }}>
                <Square size={18} className="inline mr-2" /> Stop
              </Button>
            )}
            {contractions.length > 0 && (
              <Button variant="ghost" onClick={() => { hapticLight(); clearSession() }}>
                <Trash2 size={16} className="inline mr-1.5" /> Clear
              </Button>
            )}
          </div>
        </Card>

        {/* Stats — only when contractions exist */}
        {contractions.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Count', value: contractions.length },
                { label: 'Avg Duration', value: formatContractionDuration(avgDuration) },
                { label: 'Avg Interval', value: avgInterval > 0 ? formatContractionDuration(avgInterval) : '—' },
              ].map(stat => (
                <Card key={stat.label} className="text-center">
                  <p className="text-lg font-bold text-brand-primary">{stat.value}</p>
                  <p className="text-[10px] text-brand-text/50 mt-0.5">{stat.label}</p>
                </Card>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">This Session</p>
              <div className="space-y-2">
                {contractions.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-brand-text text-sm">#{contractions.length - i}</p>
                          <p className="text-xs text-brand-text/40">
                            {c.intervalFromPrevious > 0
                              ? `${formatContractionDuration(c.intervalFromPrevious)} from previous`
                              : 'First contraction'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-primary">{formatContractionDuration(c.duration)}</p>
                          <p className="text-xs text-brand-text/40">duration</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Guidance */}
        <Card className="bg-brand-secondary/30">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={15} className="text-brand-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-brand-text mb-1">When to call your doctor</p>
              <p className="text-xs text-brand-text/60 leading-relaxed">
                Contractions 5 minutes apart, lasting 60 seconds, for at least 1 hour (5-1-1 rule).
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
