import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { sendImmediateNotification } from '../notifications/notificationService'
import { useToast } from '../components/ui/Toast'
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/haptics'
import { getTodayISO } from '../utils/dateUtils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts'
import { Moon, Scale, Footprints, Pencil, Trash2, Target, Check, X, Smartphone, Plus } from 'lucide-react'
import { useHealthData } from '../hooks/useHealthData'
import { useStepSensor } from '../hooks/useStepSensor'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { ProgressRing } from '../components/ui/ProgressRing'

const DEFAULT_STEP_GOAL = 8000

function getDayLabel(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = getTodayISO()
  if (dateStr === today) return 'Today'
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

function validateSleep(v: string) {
  const n = parseFloat(v)
  if (isNaN(n) || n <= 0) return 'Enter hours slept (e.g. 7.5)'
  if (n > 24) return 'Cannot exceed 24 hours'
  return null
}
function validateWeight(v: string) {
  const n = parseFloat(v)
  if (isNaN(n) || n <= 0) return 'Enter your weight in kg'
  if (n < 30) return 'Weight seems too low (min 30 kg)'
  if (n > 300) return 'Weight seems too high (max 300 kg)'
  return null
}
function validateSteps(v: string) {
  const n = parseInt(v)
  if (isNaN(n) || n <= 0) return 'Enter steps count'
  if (n > 100000) return 'Steps seem too high (max 100,000)'
  return null
}

export function HealthTrackerPage() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type') ?? 'sleep'
  const showSleep = type === 'sleep'
  const showWeight = type === 'weight'
  const showSteps = type === 'steps'
  const pageTitle = type === 'sleep' ? 'Sleep Tracker' : type === 'weight' ? 'Weight Tracker' : 'Steps Tracker'

  const { logMetric, deleteMetric, getTodayValue, getWeekData } = useHealthData()
  const { show: showToast } = useToast()
  const { sessionSteps, isAvailable: sensorAvailable, resetSession } = useStepSensor()

  const [sleepInput, setSleepInput] = useState('')
  const [weightInput, setWeightInput] = useState('')
  const [stepsInput, setStepsInput] = useState('')
  const [editingSleep, setEditingSleep] = useState(false)
  const [editingWeight, setEditingWeight] = useState(false)
  const [editingSteps, setEditingSteps] = useState(false)

  const [stepGoal, setStepGoal] = useState(() => {
    const saved = localStorage.getItem('stepGoal')
    return saved ? parseInt(saved) : DEFAULT_STEP_GOAL
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const sleep = getTodayValue('sleep')
  const weight = getTodayValue('weight')
  const steps = getTodayValue('steps')
  const stepsProgress = Math.min(100, (steps / stepGoal) * 100)

  const sleepData = getWeekData('sleep')
  const weightData = getWeekData('weight')
  const stepsData = getWeekData('steps').map(d => ({ ...d, label: getDayLabel(d.date) }))

  const sleepError = sleepInput ? validateSleep(sleepInput) : null
  const weightError = weightInput ? validateWeight(weightInput) : null
  const stepsError = stepsInput ? validateSteps(stepsInput) : null

  // Goal reached notification
  const prevSteps = useRef(steps)
  useEffect(() => {
    if (showSteps && prevSteps.current < stepGoal && steps >= stepGoal) {
      hapticSuccess()
      showToast(`Step goal reached! ${steps.toLocaleString()} steps today!`, 'success')
      sendImmediateNotification('Step goal reached!', `You walked ${steps.toLocaleString()} steps today!`)
    }
    prevSteps.current = steps
  }, [steps, showSteps, stepGoal])

  function handleSaveGoal() {
    const n = parseInt(goalInput)
    if (isNaN(n) || n < 500 || n > 100000) return
    setStepGoal(n)
    localStorage.setItem('stepGoal', String(n))
    showToast(`Step goal set to ${n.toLocaleString()} steps`, 'success')
    hapticLight()
    setEditingGoal(false)
    setGoalInput('')
  }

  async function handleAddSensorSteps() {
    if (sessionSteps === 0) return
    await hapticSuccess()
    const newTotal = steps + sessionSteps
    logMetric('steps', newTotal, 'steps')
    showToast(`+${sessionSteps.toLocaleString()} steps added from sensor`, 'success')
    resetSession()
    if (newTotal >= stepGoal && steps < stepGoal) {
      sendImmediateNotification('Step goal reached!', `You walked ${newTotal.toLocaleString()} steps today!`)
    }
  }

  async function handleLogSleep() {
    if (sleepError || !sleepInput) return
    await hapticLight()
    logMetric('sleep', parseFloat(sleepInput), 'hrs')
    showToast(`Sleep logged: ${sleepInput}h`, 'success')
    setSleepInput('')
    setEditingSleep(false)
  }

  async function handleLogWeight() {
    if (weightError || !weightInput) return
    await hapticLight()
    logMetric('weight', parseFloat(weightInput), 'kg')
    showToast(`Weight logged: ${weightInput} kg`, 'success')
    setWeightInput('')
    setEditingWeight(false)
  }

  async function handleLogSteps() {
    if (stepsError || !stepsInput) return
    await hapticLight()
    logMetric('steps', parseInt(stepsInput), 'steps')
    showToast(`Steps logged: ${parseInt(stepsInput).toLocaleString()}`, 'success')
    setStepsInput('')
    setEditingSteps(false)
  }

  async function handleDelete(type: 'sleep' | 'weight' | 'steps') {
    await hapticMedium()
    await deleteMetric(type)
    const label = type === 'sleep' ? 'Sleep' : type === 'weight' ? 'Weight' : 'Steps'
    showToast(`${label} log cleared`, 'info')
  }

  function startEdit(type: 'sleep' | 'weight' | 'steps') {
    if (type === 'sleep') { setSleepInput(sleep > 0 ? String(sleep) : ''); setEditingSleep(true) }
    if (type === 'weight') { setWeightInput(weight > 0 ? String(weight) : ''); setEditingWeight(true) }
    if (type === 'steps') { setStepsInput(steps > 0 ? String(steps) : ''); setEditingSteps(true) }
    hapticLight()
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title={pageTitle} />
      <div className="px-5 space-y-4 pb-8">

        {/* ─── SLEEP ─── */}
        {showSleep && (
          <Card gradient>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Moon size={18} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-text text-sm">Sleep</p>
                <p className="text-xs text-brand-text/50">
                  {sleep > 0 ? 'Logged today' : 'Not logged today'}
                </p>
              </div>
              {sleep > 0 && (
                <p className="text-2xl font-bold text-indigo-500 flex-shrink-0">
                  {sleep}<span className="text-sm font-medium text-indigo-400">h</span>
                </p>
              )}
            </div>

            <AnimatePresence>
              {(sleep === 0 || editingSleep) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mt-3 pt-3 border-t border-brand-secondary/30">
                    <div className="flex-1">
                      <input
                        type="number" min="0.5" max="24" step="0.5"
                        value={sleepInput}
                        onChange={e => setSleepInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogSleep()}
                        placeholder="Hours slept (e.g. 7.5)"
                        className="w-full rounded-xl border border-brand-secondary bg-white px-3 py-2.5 text-sm text-brand-text placeholder-brand-text/30 focus:outline-none focus:border-indigo-300 transition-colors"
                      />
                      {sleepError && <p className="text-[11px] text-red-400 mt-1 ml-1">{sleepError}</p>}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogSleep}
                      disabled={!sleepInput || !!sleepError}
                      className="px-4 rounded-xl bg-indigo-500 text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                    >
                      {editingSleep ? 'Update' : 'Log'}
                    </motion.button>
                    {editingSleep && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setEditingSleep(false); setSleepInput('') }}
                        className="px-3 rounded-xl bg-gray-100 text-gray-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {sleep > 0 && !editingSleep && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-brand-secondary/30">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startEdit('sleep')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-secondary/50 text-xs font-semibold text-brand-text/70">
                  <Pencil size={11} /> Edit
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDelete('sleep')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-xs font-semibold text-red-400">
                  <Trash2 size={11} /> Clear
                </motion.button>
              </div>
            )}
          </Card>
        )}

        {showSleep && (
          <Card>
            <p className="font-bold text-brand-text text-sm mb-4">Sleep (7 days)</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={sleepData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={25} domain={[0, 12]} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', background: '#FFF5F7', fontSize: 12 }}
                  formatter={(v) => [`${v}h sleep`]} />
                <Line type="monotone" dataKey="value" stroke="#818CF8" strokeWidth={2.5} dot={{ fill: '#818CF8', r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ─── WEIGHT ─── */}
        {showWeight && (
          <Card gradient>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <Scale size={18} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-text text-sm">Weight</p>
                <p className="text-xs text-brand-text/50">
                  {weight > 0 ? 'Logged today' : 'Not logged today'}
                </p>
              </div>
              {weight > 0 && (
                <p className="text-2xl font-bold text-green-500 flex-shrink-0">
                  {weight}<span className="text-sm font-medium text-green-400">kg</span>
                </p>
              )}
            </div>

            <AnimatePresence>
              {(weight === 0 || editingWeight) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mt-3 pt-3 border-t border-brand-secondary/30">
                    <div className="flex-1">
                      <input
                        type="number" min="30" max="300" step="0.1"
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogWeight()}
                        placeholder="Weight in kg (e.g. 65.5)"
                        className="w-full rounded-xl border border-brand-secondary bg-white px-3 py-2.5 text-sm text-brand-text placeholder-brand-text/30 focus:outline-none focus:border-green-300 transition-colors"
                      />
                      {weightError && <p className="text-[11px] text-red-400 mt-1 ml-1">{weightError}</p>}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogWeight}
                      disabled={!weightInput || !!weightError}
                      className="px-4 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                    >
                      {editingWeight ? 'Update' : 'Log'}
                    </motion.button>
                    {editingWeight && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setEditingWeight(false); setWeightInput('') }}
                        className="px-3 rounded-xl bg-gray-100 text-gray-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {weight > 0 && !editingWeight && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-brand-secondary/30">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startEdit('weight')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-secondary/50 text-xs font-semibold text-brand-text/70">
                  <Pencil size={11} /> Edit
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDelete('weight')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-xs font-semibold text-red-400">
                  <Trash2 size={11} /> Clear
                </motion.button>
              </div>
            )}
          </Card>
        )}

        {showWeight && weightData.some(d => d.value > 0) && (
          <Card>
            <p className="font-bold text-brand-text text-sm mb-4">Weight Trend (7 days)</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={weightData}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false}
                  tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={35} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', background: '#FFF5F7', fontSize: 12 }}
                  formatter={(v) => [`${v} kg`]} />
                <Line type="monotone" dataKey="value" stroke="#34D399" strokeWidth={2.5} dot={{ fill: '#34D399', r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ─── STEPS ─── */}
        {showSteps && (
          <Card gradient>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Footprints size={18} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-brand-text text-sm">Daily Steps</p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setGoalInput(String(stepGoal)); setEditingGoal(v => !v) }}
                  className="flex items-center gap-1 mt-0.5"
                >
                  <Target size={10} className="text-orange-400" />
                  <span className="text-xs text-brand-text/50">Goal: {stepGoal.toLocaleString()} steps</span>
                  <Pencil size={9} className="text-brand-text/25 ml-0.5" />
                </motion.button>
              </div>
            </div>

            {/* Goal editor */}
            <AnimatePresence>
              {editingGoal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-orange-50 rounded-xl p-3 space-y-3">
                    <p className="text-xs font-semibold text-orange-700">Set daily step goal</p>
                    {/* Preset chips */}
                    <div className="flex gap-2">
                      {[5000, 6000, 8000, 10000].map(p => (
                        <motion.button
                          key={p}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setGoalInput(String(p))}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            parseInt(goalInput) === p
                              ? 'bg-orange-500 text-white'
                              : 'bg-white text-orange-500 border border-orange-200'
                          }`}
                        >
                          {p >= 1000 ? `${p / 1000}k` : p}
                        </motion.button>
                      ))}
                    </div>
                    {/* Custom input + save */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={goalInput}
                        onChange={e => setGoalInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                        placeholder="Custom goal"
                        className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm text-brand-text placeholder-brand-text/30 focus:outline-none focus:border-orange-400 transition-colors"
                        autoFocus
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveGoal}
                        disabled={!goalInput || isNaN(parseInt(goalInput)) || parseInt(goalInput) < 500}
                        className="flex items-center gap-1.5 px-4 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                      >
                        <Check size={14} /> Save
                      </motion.button>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setEditingGoal(false); setGoalInput('') }}
                      className="w-full py-2 rounded-xl bg-white text-xs text-brand-text/50 font-medium border border-orange-100"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress ring + stats */}
            <div className="flex items-center gap-5 mb-4">
              <ProgressRing
                progress={stepsProgress} size={100} strokeWidth={9}
                color={steps >= stepGoal ? '#34D399' : '#F97316'} trackColor="#FED7AA"
              >
                <div className="text-center">
                  <p className="text-base font-bold text-orange-500 leading-tight">
                    {steps > 0 ? steps.toLocaleString() : '0'}
                  </p>
                  <p className="text-[9px] text-brand-text/40 leading-tight">steps</p>
                </div>
              </ProgressRing>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-bold text-brand-text">
                  {steps >= stepGoal ? 'Goal reached!' : `${(stepGoal - steps).toLocaleString()} to go`}
                </p>
                <p className="text-xs text-brand-text/50">{Math.round(stepsProgress)}% of daily goal</p>
                {steps > 0 && (
                  <p className="text-xs text-green-500 font-medium">
                    ~{Math.round(steps * 0.0007 * 10) / 10} km walked
                  </p>
                )}
              </div>
            </div>

            {/* Live sensor panel */}
            <div className={`rounded-xl p-3 mb-3 ${sensorAvailable ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50 border border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone size={14} className={sensorAvailable ? 'text-orange-400' : 'text-gray-400'} />
                  <div>
                    <p className="text-xs font-semibold text-brand-text/70">
                      {sensorAvailable ? 'Live sensor' : 'Waiting for motion…'}
                    </p>
                    {sensorAvailable && (
                      <p className="text-[10px] text-brand-text/40">Move with the app open to count</p>
                    )}
                  </div>
                </div>
                {sensorAvailable && (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-orange-500">+{sessionSteps}</p>
                    {sessionSteps > 0 && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddSensorSteps}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold"
                      >
                        <Plus size={11} /> Add
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Manual entry or action row */}
            <AnimatePresence>
              {(steps === 0 || editingSteps) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 pt-1">
                    <div className="flex-1">
                      <input
                        type="number" min="1" max="100000"
                        value={stepsInput}
                        onChange={e => setStepsInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogSteps()}
                        placeholder="Or enter steps manually"
                        className="w-full rounded-xl border border-brand-secondary bg-white px-3 py-2.5 text-sm text-brand-text placeholder-brand-text/30 focus:outline-none focus:border-orange-300 transition-colors"
                      />
                      {stepsError && <p className="text-[11px] text-red-400 mt-1 ml-1">{stepsError}</p>}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleLogSteps}
                      disabled={!stepsInput || !!stepsError}
                      className="px-4 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 flex-shrink-0"
                    >
                      {editingSteps ? 'Update' : 'Log'}
                    </motion.button>
                    {editingSteps && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setEditingSteps(false); setStepsInput('') }}
                        className="px-3 rounded-xl bg-gray-100 text-gray-500 flex-shrink-0"
                      >
                        <X size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {steps > 0 && !editingSteps && (
              <div className="flex gap-2 pt-3 border-t border-brand-secondary/30">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startEdit('steps')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-brand-secondary/50 text-xs font-semibold text-brand-text/70">
                  <Pencil size={11} /> Edit
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDelete('steps')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-xs font-semibold text-red-400">
                  <Trash2 size={11} /> Clear
                </motion.button>
              </div>
            )}
          </Card>
        )}

        {/* Steps 7-day bar chart */}
        {showSteps && stepsData.some(d => d.value > 0) && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-brand-text text-sm">Steps (7 days)</p>
              <div className="flex items-center gap-3 text-[10px] text-brand-text/50">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Goal met
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Below
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stepsData} barSize={28}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9B6B7B' }} axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: 'none', background: '#FFF5F7', fontSize: 12 }}
                  formatter={(v: number) => [`${v.toLocaleString()} steps`]}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="value" radius={[6, 6, 2, 2]}>
                  {stepsData.map((entry, i) => (
                    <Cell key={i} fill={entry.value >= stepGoal ? '#34D399' : entry.value > 0 ? '#F97316' : '#FED7AA'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

      </div>
    </div>
  )
}
