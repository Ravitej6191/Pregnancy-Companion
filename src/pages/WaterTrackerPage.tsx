import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, Droplets, RotateCcw, Pencil, Check } from 'lucide-react'
import { useHealthData } from '../hooks/useHealthData'
import { sendImmediateNotification } from '../notifications/notificationService'
import { useToast } from '../components/ui/Toast'
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressRing } from '../components/ui/ProgressRing'

const GLASS_ML = 250
const GOAL_KEY = 'waterGoalMl'
const DEFAULT_GOAL = 2000

function getStoredGoal(): number {
  const stored = localStorage.getItem(GOAL_KEY)
  if (stored) {
    const n = parseInt(stored, 10)
    if (!isNaN(n) && n >= 250 && n <= 10000) return n
  }
  return DEFAULT_GOAL
}

const GOAL_PRESETS = [1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7000, 8000, 9000, 10000]

export function WaterTrackerPage() {
  const { getTodayValue, logMetric, deleteMetric } = useHealthData()
  const { show: showToast } = useToast()
  const [dailyGoalMl, setDailyGoalMl] = useState<number>(getStoredGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState(String(getStoredGoal()))

  const currentMl = getTodayValue('water')
  const glasses = Math.round(currentMl / GLASS_ML)
  const goalGlasses = Math.round(dailyGoalMl / GLASS_ML)
  const progress = Math.min(100, (currentMl / dailyGoalMl) * 100)

  const goalNotified = useRef(false)
  useEffect(() => {
    if (!goalNotified.current && currentMl >= dailyGoalMl && currentMl > 0) {
      goalNotified.current = true
      hapticSuccess()
      showToast('Hydration goal reached! Amazing!', 'success')
      sendImmediateNotification('Hydration goal reached!', `You drank ${Math.round(currentMl / 100) / 10}L today!`)
    }
    if (currentMl === 0) goalNotified.current = false
  }, [currentMl, dailyGoalMl])

  async function addGlass() {
    await hapticLight()
    try {
      logMetric('water', currentMl + GLASS_ML, 'ml')
      showToast('+250 ml logged', 'info')
    } catch {
      showToast('Could not log water. Try again.', 'error')
    }
  }

  async function removeGlass() {
    if (currentMl < GLASS_ML) return
    await hapticLight()
    try {
      logMetric('water', currentMl - GLASS_ML, 'ml')
      showToast('−250 ml removed', 'info')
    } catch {
      showToast('Could not update water log.', 'error')
    }
  }

  async function resetWater() {
    if (currentMl === 0) return
    await hapticMedium()
    try {
      await deleteMetric('water')
      showToast('Water log reset', 'info')
    } catch {
      showToast('Could not reset water log.', 'error')
    }
  }

  function saveGoal() {
    const n = parseInt(goalInput, 10)
    if (isNaN(n) || n < 250 || n > 10000) {
      showToast('Enter a goal between 250 ml and 10,000 ml', 'error')
      return
    }
    const rounded = Math.round(n / GLASS_ML) * GLASS_ML // round to nearest glass
    localStorage.setItem(GOAL_KEY, String(rounded))
    setDailyGoalMl(rounded)
    setGoalInput(String(rounded))
    setEditingGoal(false)
    goalNotified.current = false
    showToast(`Daily goal set to ${rounded} ml`, 'success')
  }

  const encouragement = progress >= 100
    ? 'Goal reached! Amazing!'
    : progress >= 75 ? 'Almost there, keep going!'
    : progress >= 50 ? 'Halfway there, great job!'
    : progress >= 25 ? "Keep sipping, you've got this!"
    : 'Start hydrating — your baby needs it!'

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Water Tracker"
        right={
          currentMl > 0 ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={resetWater}
              aria-label="Reset today's water log"
              className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center"
            >
              <RotateCcw size={16} className="text-red-400" />
            </motion.button>
          ) : undefined
        }
      />
      <div className="px-5 space-y-5 pb-8">

        <Card gradient className="flex flex-col items-center py-8">
          <ProgressRing progress={progress} size={180} strokeWidth={14} color="#60A5FA" trackColor="#DBEAFE">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{glasses}</p>
              <p className="text-xs text-brand-text/50 font-medium">/ {goalGlasses}</p>
              <p className="text-xs text-brand-text/50">glasses</p>
            </div>
          </ProgressRing>
          <p className="text-sm text-brand-text/60 mt-4 font-medium">{currentMl} ml / {dailyGoalMl} ml daily goal</p>
          <p className="text-xs text-blue-500 font-semibold mt-1">{encouragement}</p>
        </Card>

        <Card>
          <p className="text-sm font-bold text-brand-text mb-4 text-center">Log Water Intake</p>
          <div className="flex items-center gap-4">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={removeGlass}
              disabled={currentMl < GLASS_ML}
              aria-label="Remove one glass"
              className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center disabled:opacity-30 transition-opacity flex-shrink-0"
            >
              <Minus size={22} className="text-gray-500" />
            </motion.button>
            <div className="flex-1 text-center">
              <p className="text-3xl font-bold text-blue-500">{currentMl}</p>
              <p className="text-xs text-brand-text/40 mt-0.5">ml today</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={addGlass}
              aria-label="Add one glass"
              className="w-14 h-14 rounded-xl bg-blue-500 flex items-center justify-center shadow-soft flex-shrink-0"
            >
              <Plus size={22} className="text-white" />
            </motion.button>
          </div>
          <p className="text-center text-xs text-brand-text/40 mt-3">1 glass = 250 ml</p>
        </Card>

        {/* Daily goal edit */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-brand-text">Daily Goal</p>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (editingGoal) saveGoal()
                else { setGoalInput(String(dailyGoalMl)); setEditingGoal(true) }
              }}
              className="w-8 h-8 rounded-lg bg-brand-secondary/40 flex items-center justify-center"
            >
              {editingGoal
                ? <Check size={15} className="text-green-500" />
                : <Pencil size={13} className="text-brand-primary" />}
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {editingGoal ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveGoal()}
                    className="flex-1 border border-brand-secondary/60 rounded-xl px-3 py-2.5 text-sm font-bold text-brand-text bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    placeholder="e.g. 2000"
                    min={250}
                    max={10000}
                    step={250}
                  />
                  <span className="text-xs text-brand-text/40 font-medium">ml</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GOAL_PRESETS.map(preset => (
                    <button
                      key={preset}
                      onClick={() => { setGoalInput(String(preset)) }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${parseInt(goalInput) === preset ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}
                    >
                      {preset >= 1000 ? `${preset / 1000}L` : `${preset}ml`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-brand-text/30">Recommended for pregnant women: 2–2.5 L/day</p>
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 bg-blue-50 rounded-xl px-4 py-3">
                  <p className="text-xl font-bold text-blue-500">{dailyGoalMl >= 1000 ? `${dailyGoalMl / 1000}L` : `${dailyGoalMl} ml`}</p>
                  <p className="text-[11px] text-blue-400/70">{goalGlasses} glasses per day</p>
                </div>
                <p className="text-xs text-brand-text/30 text-center">Tap ✏️ to edit</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <Card>
          <p className="text-sm font-bold text-brand-text mb-3">Today's Progress</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: goalGlasses }).map((_, i) => (
              <div
                key={i}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  i < glasses ? 'bg-blue-400' : 'bg-blue-100'
                }`}
              >
                <Droplets size={16} className={i < glasses ? 'text-white' : 'text-blue-200'} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-blue-50 border border-blue-100">
          <p className="text-xs font-bold text-blue-600 mb-1">Hydration Tips</p>
          <ul className="text-xs text-brand-text/70 space-y-1 leading-relaxed">
            <li>• Drink coconut water daily — natural electrolytes for both of you</li>
            <li>• Keep a water bottle nearby at all times</li>
            <li>• Add lemon or sabja seeds for variety</li>
            <li>• Drink before, during, and after light exercise</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
