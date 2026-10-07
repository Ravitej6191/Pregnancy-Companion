import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Trash2, CheckCircle2, ClipboardList, Minus, TrendingUp, Calendar, Bell, Pencil } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { sendImmediateNotification, buildNextOccurrence } from '../notifications/notificationService'
import { useReminders } from '../hooks/useReminders'
import { useToast } from '../components/ui/Toast'
import { useDailyTasks } from '../hooks/useDailyTasks'
import { db } from '../db/database'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { ProgressRing } from '../components/ui/ProgressRing'
import type { DailyTask, RecurrenceType } from '../types'

const EMOJI_OPTIONS = ['✅', '💊', '🍎', '💧', '🚶', '🧘', '😴', '📔', '🌸', '❤️', '🍵', '🏃', '🥗', '🍊', '🌰', '🫐']

type ViewTab = 'today' | 'week' | 'month'

function getNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getShortDay(dateStr: string): string {
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

interface DayStats { date: string; completed: number; total: number; rate: number }
interface TaskStats { taskKey: string; label: string; emoji: string; completedDays: number; totalDays: number; rate: number }

function computeSummary(
  tasks: { date: string; taskKey: string; label: string; emoji: string; isCompleted: boolean }[],
  days: string[]
) {
  const dayMap = new Map<string, DayStats>()
  const taskMap = new Map<string, TaskStats>()

  for (const day of days) dayMap.set(day, { date: day, completed: 0, total: 0, rate: 0 })

  for (const t of tasks) {
    if (!dayMap.has(t.date)) continue
    const day = dayMap.get(t.date)!
    day.total += 1
    if (t.isCompleted) day.completed += 1

    if (!taskMap.has(t.taskKey)) {
      taskMap.set(t.taskKey, { taskKey: t.taskKey, label: t.label, emoji: t.emoji, completedDays: 0, totalDays: 0, rate: 0 })
    }
    const ts = taskMap.get(t.taskKey)!
    ts.totalDays += 1
    if (t.isCompleted) ts.completedDays += 1
  }

  for (const [, d] of dayMap) d.rate = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
  for (const [, ts] of taskMap) ts.rate = ts.totalDays > 0 ? Math.round((ts.completedDays / ts.totalDays) * 100) : 0

  const dayList = days.map(d => dayMap.get(d)!)
  const taskList = [...taskMap.values()].sort((a, b) => b.rate - a.rate)
  const totalCompleted = dayList.reduce((s, d) => s + d.completed, 0)
  const totalTasks = dayList.reduce((s, d) => s + d.total, 0)
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
  const fullDays = dayList.filter(d => d.total > 0 && d.rate === 100).length
  const activeDays = dayList.filter(d => d.total > 0).length

  return { dayList, taskList, overallRate, fullDays, activeDays }
}

export function DailyChecklistPage() {
  const { tasks, completedCount, totalCount, progress, toggleTask, incrementTask, decrementTask, addCustomTask, deleteTask, updateTask, ensureTodayTasks } = useDailyTasks()
  const { addReminder } = useReminders()
  const { show } = useToast()

  // Add task state
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('✅')
  const [newTargetCount, setNewTargetCount] = useState(1)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [reminderRecurrence, setReminderRecurrence] = useState<RecurrenceType>('daily')
  const [addSaving, setAddSaving] = useState(false)

  // Edit task state
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editEmoji, setEditEmoji] = useState('✅')
  const [editTargetCount, setEditTargetCount] = useState(1)
  const [editReminderEnabled, setEditReminderEnabled] = useState(false)
  const [editReminderTime, setEditReminderTime] = useState('08:00')
  const [editReminderRecurrence, setEditReminderRecurrence] = useState<RecurrenceType>('daily')
  const [editSaving, setEditSaving] = useState(false)

  const [activeTab, setActiveTab] = useState<ViewTab>('today')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { ensureTodayTasks() }, [])  // run once on mount

  const allDoneNotified = useRef(false)
  useEffect(() => {
    if (!allDoneNotified.current && progress === 100 && totalCount > 0) {
      allDoneNotified.current = true
      sendImmediateNotification('Routine complete!', `All ${totalCount} tasks done for today. You are amazing!`)
    }
    if (progress < 100) allDoneNotified.current = false
  }, [progress, totalCount])

  const weekStart = getNDaysAgo(6)
  const weekTasks = useLiveQuery(() => db.dailyTasks.where('date').aboveOrEqual(weekStart).toArray(), [weekStart]) ?? []
  const weekDays = Array.from({ length: 7 }, (_, i) => getNDaysAgo(6 - i))
  const weekSummary = computeSummary(weekTasks, weekDays)

  const monthStart = getNDaysAgo(29)
  const monthTasks = useLiveQuery(() => db.dailyTasks.where('date').aboveOrEqual(monthStart).toArray(), [monthStart]) ?? []
  const monthDays = Array.from({ length: 30 }, (_, i) => getNDaysAgo(29 - i))
  const monthSummary = computeSummary(monthTasks, monthDays)

  const wellnessRaw = (weekSummary.overallRate * 0.6 + monthSummary.overallRate * 0.4) / 10
  const wellnessIndex = wellnessRaw.toFixed(1)
  const wellnessColor = wellnessRaw >= 8 ? '#34D399' : wellnessRaw >= 5 ? '#F97316' : '#F87171'

  async function handleAdd() {
    if (!newLabel.trim() || addSaving) return
    setAddSaving(true)
    try {
      await addCustomTask(newLabel.trim(), newEmoji, newTargetCount)

      // Schedule reminder if enabled — use addReminder so it's tracked in DB
      if (reminderEnabled) {
        try {
          const nextOccurrence = buildNextOccurrence(reminderTime)
          await addReminder({
            title: newLabel.trim(),
            body: `Time to: ${newLabel.trim()}`,
            scheduledAt: nextOccurrence.toISOString(),
            recurrence: reminderRecurrence,
            recurrenceDays: [],
            isActive: true,
            category: 'custom',
          })
          show('Task added with reminder!', 'success')
        } catch {
          show('Task added, but reminder could not be set.', 'info')
        }
      } else {
        show('Task added!', 'success')
      }

      setNewLabel(''); setNewEmoji('✅'); setNewTargetCount(1)
      setReminderEnabled(false); setReminderTime('08:00'); setReminderRecurrence('daily')
      setShowAdd(false)
    } catch {
      show('Could not add task. Try again.', 'error')
    } finally {
      setAddSaving(false)
    }
  }

  function openEdit(task: DailyTask) {
    setEditingTask(task)
    setEditLabel(task.label)
    setEditEmoji(task.emoji)
    setEditTargetCount(task.targetCount ?? 1)
    setEditReminderEnabled(false)
    setEditReminderTime('08:00')
    setEditReminderRecurrence('daily')
  }

  async function handleEditSave() {
    if (!editingTask?.id || !editLabel.trim() || editSaving) return
    setEditSaving(true)
    try {
      await updateTask(editingTask.id, editLabel.trim(), editEmoji, editTargetCount)
      if (editReminderEnabled) {
        try {
          const nextOccurrence = buildNextOccurrence(editReminderTime)
          await addReminder({
            title: editLabel.trim(),
            body: `Time to: ${editLabel.trim()}`,
            scheduledAt: nextOccurrence.toISOString(),
            recurrence: editReminderRecurrence,
            recurrenceDays: [],
            isActive: true,
            category: 'custom',
          })
          show('Task updated with reminder!', 'success')
        } catch {
          show('Task updated, but reminder could not be set.', 'info')
        }
      } else {
        show('Task updated!', 'success')
      }
      setEditingTask(null)
    } catch {
      show('Could not update task. Try again.', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const RECURRENCE_LABELS: Record<RecurrenceType, string> = { once: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="My Routine"
        right={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} className="inline mr-1" /> Add
          </Button>
        }
      />

      <div className="px-5 space-y-3 pb-8">

        {/* Tab switcher */}
        <div className="flex bg-white rounded-2xl p-1 shadow-card gap-1">
          {(['today', 'week', 'month'] as ViewTab[]).map(tab => (
            <motion.button
              key={tab}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all capitalize ${
                activeTab === tab ? 'bg-brand-primary text-white shadow-soft' : 'text-brand-text/50'
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── TODAY ── */}
          {activeTab === 'today' && (
            <motion.div key="today" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <Card gradient className="flex items-center gap-5">
                <ProgressRing progress={progress} size={72} strokeWidth={7} color="#FF8FAB">
                  <span className="text-sm font-bold text-brand-primary">{Math.round(progress)}%</span>
                </ProgressRing>
                <div>
                  <p className="text-xs text-brand-text/50 mb-0.5">{dateStr}</p>
                  <p className="font-bold text-brand-text">{completedCount}/{totalCount} done</p>
                </div>
              </Card>

              {(!tasks || tasks.length === 0) ? (
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-brand-secondary/40 flex items-center justify-center mx-auto mb-3">
                      <ClipboardList size={32} className="text-brand-primary/50" />
                    </div>
                    <p className="font-bold text-brand-text text-base">No tasks yet</p>
                    <p className="text-sm text-brand-text/40 mt-1">Build your daily routine — vitamins, yoga, water, sleep...</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center pb-4">
                    {[
                      { label: '💊 Take vitamins', name: 'Take vitamins' },
                      { label: '🧘 Prenatal yoga', name: 'Prenatal yoga' },
                      { label: '💧 Drink water', name: 'Drink water' },
                      { label: '😴 Rest / Sleep', name: 'Rest / Sleep' },
                    ].map(chip => (
                      <button
                        key={chip.name}
                        type="button"
                        onClick={() => { setNewLabel(chip.name); setShowAdd(true) }}
                        className="px-4 py-2 rounded-2xl bg-brand-secondary/50 text-xs font-semibold text-brand-text/70 active:bg-brand-primary active:text-white transition-colors"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {tasks.map(task => {
                    const target = task.targetCount ?? 1
                    const count = task.completedCount ?? 0
                    const isMulti = target > 1
                    return (
                      <motion.div key={task.id} layout
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
                        <Card>
                          <div className="flex items-center gap-3">
                            {isMulti ? (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <motion.button whileTap={{ scale: 0.82 }}
                                  onClick={() => task.id && decrementTask(task.id)} disabled={count === 0}
                                  className="w-6 h-6 rounded-full bg-brand-secondary/60 flex items-center justify-center disabled:opacity-30">
                                  <Minus size={10} className="text-brand-text/60" />
                                </motion.button>
                                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.isCompleted ? 'bg-green-400 border-green-400' : 'border-brand-secondary bg-white'}`}>
                                  {task.isCompleted
                                    ? <Check size={13} className="text-white" strokeWidth={3} />
                                    : <span className="text-[10px] font-bold text-brand-text/60">{count}/{target}</span>}
                                </div>
                                <motion.button whileTap={{ scale: 0.82 }}
                                  onClick={() => task.id && incrementTask(task.id)} disabled={task.isCompleted}
                                  className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center disabled:opacity-30">
                                  <Plus size={10} className="text-brand-primary" />
                                </motion.button>
                              </div>
                            ) : (
                              <motion.button whileTap={{ scale: 0.82 }}
                                onClick={() => task.id && toggleTask(task.id, !task.isCompleted)}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.isCompleted ? 'bg-green-400 border-green-400' : 'border-brand-secondary bg-white'}`}>
                                <AnimatePresence>
                                  {task.isCompleted && (
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                      <Check size={13} className="text-white" strokeWidth={3} />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.button>
                            )}
                            <span className="text-xl">{task.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium block ${task.isCompleted ? 'line-through text-brand-text/40' : 'text-brand-text/80'}`}>
                                {task.label}
                              </span>
                              {isMulti && <span className="text-[10px] text-brand-text/40 font-medium">{target}× per day</span>}
                            </div>
                            <motion.button whileTap={{ scale: 0.82 }}
                              onClick={() => openEdit(task)}
                              className="w-7 h-7 flex items-center justify-center text-brand-text/25 active:text-brand-primary transition-colors">
                              <Pencil size={13} />
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.82 }}
                              onClick={() => task.id && deleteTask(task.id).then(() => show('Task removed', 'info'))}
                              className="w-7 h-7 flex items-center justify-center text-brand-text/20 active:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}

              {progress === 100 && totalCount > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50 text-center py-5">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 size={26} className="text-green-500" />
                    </div>
                    <p className="font-bold text-green-700">All done! You're amazing!</p>
                    <p className="text-xs text-green-600/70 mt-1">Taking great care of yourself and your baby</p>
                  </Card>
                </motion.div>
              )}

              <p className="text-center text-xs text-brand-text/30 pb-2">Tasks reset daily</p>
            </motion.div>
          )}

          {/* ── WEEK ── */}
          {activeTab === 'week' && (
            <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card gradient>
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[56px]">
                    <p className="text-3xl font-bold" style={{ color: wellnessColor }}>{wellnessIndex}</p>
                    <p className="text-[10px] text-brand-text/50 font-semibold">/ 10</p>
                    <p className="text-[10px] text-brand-text/40">wellness</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between">
                      <p className="text-xs text-brand-text/60">This week</p>
                      <p className="text-sm font-bold text-brand-text">{weekSummary.overallRate}%</p>
                    </div>
                    <div className="h-2 bg-brand-secondary/40 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${weekSummary.overallRate}%` }}
                        className="h-full rounded-full" style={{ background: wellnessColor }} />
                    </div>
                    <p className="text-[10px] text-brand-text/40">
                      {weekSummary.fullDays}/{weekSummary.activeDays} perfect days · {weekSummary.activeDays} active days
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-brand-text text-sm mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-brand-primary" /> Daily Completion
                </p>
                <div className="flex gap-1.5">
                  {weekSummary.dayList.map(day => {
                    const isToday = day.date === getTodayStr()
                    const bg = day.total === 0 ? '#F3F4F6' : day.rate === 100 ? '#34D399' : day.rate >= 50 ? '#FBBF24' : '#FCA5A5'
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full aspect-square rounded-xl flex items-center justify-center ${isToday ? 'ring-2 ring-brand-primary' : ''}`}
                          style={{ backgroundColor: bg }}>
                          {day.rate === 100 && day.total > 0 && <Check size={12} className="text-white" strokeWidth={3} />}
                          {day.rate > 0 && day.rate < 100 && <span className="text-[9px] font-bold text-white">{day.rate}%</span>}
                        </div>
                        <p className="text-[9px] text-brand-text/50 font-medium">{getShortDay(day.date)}</p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-3 flex-wrap text-[9px] text-brand-text/40">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" /> All done</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400 inline-block" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-300 inline-block" /> Missed</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-200 inline-block" /> No data</span>
                </div>
              </Card>

              {weekSummary.taskList.length > 0 && (
                <Card>
                  <p className="font-bold text-brand-text text-sm mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-brand-primary" /> Task Consistency
                  </p>
                  <div className="space-y-3">
                    {weekSummary.taskList.map(ts => (
                      <div key={ts.taskKey}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-brand-text/80">{ts.emoji} {ts.label}</span>
                          <span className="text-xs font-bold text-brand-text">{ts.rate}%</span>
                        </div>
                        <div className="h-1.5 bg-brand-secondary/40 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${ts.rate}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: ts.rate >= 80 ? '#34D399' : ts.rate >= 50 ? '#FBBF24' : '#FCA5A5' }} />
                        </div>
                        <p className="text-[10px] text-brand-text/30 mt-0.5">{ts.completedDays}/{ts.totalDays} days</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {weekSummary.activeDays === 0 && (
                <div className="text-center py-10">
                  <p className="text-brand-text/40 text-sm">No data for this week yet.</p>
                  <p className="text-brand-text/30 text-xs mt-1">Complete tasks in Today tab to see your progress.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── MONTH ── */}
          {activeTab === 'month' && (
            <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <Card gradient>
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[56px]">
                    <p className="text-3xl font-bold" style={{ color: wellnessColor }}>{wellnessIndex}</p>
                    <p className="text-[10px] text-brand-text/50 font-semibold">/ 10</p>
                    <p className="text-[10px] text-brand-text/40">wellness</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex justify-between">
                      <p className="text-xs text-brand-text/60">This month</p>
                      <p className="text-sm font-bold text-brand-text">{monthSummary.overallRate}%</p>
                    </div>
                    <div className="h-2 bg-brand-secondary/40 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${monthSummary.overallRate}%` }}
                        className="h-full rounded-full" style={{ background: wellnessColor }} />
                    </div>
                    <p className="text-[10px] text-brand-text/40">
                      {monthSummary.fullDays}/{monthSummary.activeDays} perfect days this month
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <p className="font-bold text-brand-text text-sm mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-brand-primary" /> 30-Day Heatmap
                </p>
                <div className="grid grid-cols-10 gap-1">
                  {monthSummary.dayList.map(day => {
                    const isToday = day.date === getTodayStr()
                    const bg = day.total === 0 ? '#F3F4F6' : day.rate === 100 ? '#34D399' : day.rate >= 50 ? '#FBBF24' : '#FCA5A5'
                    return (
                      <div key={day.date}
                        className={`aspect-square rounded-md ${isToday ? 'ring-2 ring-brand-primary' : ''}`}
                        style={{ backgroundColor: bg }} />
                    )
                  })}
                </div>
                <div className="flex items-center gap-3 mt-3 flex-wrap text-[9px] text-brand-text/40">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400 inline-block" /> All done</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400 inline-block" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-300 inline-block" /> Missed</span>
                </div>
              </Card>

              {monthSummary.taskList.length > 0 && (
                <Card>
                  <p className="font-bold text-brand-text text-sm mb-3 flex items-center gap-2">
                    <TrendingUp size={14} className="text-brand-primary" /> Task Consistency
                  </p>
                  <div className="space-y-3">
                    {monthSummary.taskList.map(ts => (
                      <div key={ts.taskKey}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-brand-text/80">{ts.emoji} {ts.label}</span>
                          <span className="text-xs font-bold text-brand-text">{ts.rate}%</span>
                        </div>
                        <div className="h-1.5 bg-brand-secondary/40 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${ts.rate}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: ts.rate >= 80 ? '#34D399' : ts.rate >= 50 ? '#FBBF24' : '#FCA5A5' }} />
                        </div>
                        <p className="text-[10px] text-brand-text/30 mt-0.5">{ts.completedDays}/{ts.totalDays} days</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {monthSummary.activeDays > 0 && (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                  <p className="text-xs font-bold text-purple-700 mb-1">Monthly Insight</p>
                  <p className="text-xs text-brand-text/60 leading-relaxed">
                    {monthSummary.overallRate >= 80
                      ? `Excellent consistency! ${monthSummary.fullDays} perfect days this month. Keep it up!`
                      : monthSummary.overallRate >= 50
                      ? `Good effort! ${monthSummary.fullDays} perfect days. Small consistent steps lead to big results.`
                      : `Every effort counts. Try to complete at least one task each day — consistency builds momentum.`}
                  </p>
                </Card>
              )}

              {monthSummary.activeDays === 0 && (
                <div className="text-center py-10">
                  <p className="text-brand-text/40 text-sm">No data for this month yet.</p>
                  <p className="text-brand-text/30 text-xs mt-1">Complete tasks in Today tab to see your progress.</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Add Task Modal ── */}
      <Modal isOpen={showAdd} onClose={() => { setShowAdd(false); setNewTargetCount(1); setReminderEnabled(false) }} title="Add Task">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-text/80 mb-2">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setNewEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl transition-all ${newEmoji === e ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-brand-bg'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Input label="Task Name" placeholder="e.g. Morning walk" value={newLabel}
            onChange={e => setNewLabel(e.target.value)} />
          <div>
            <label className="block text-sm font-semibold text-brand-text/80 mb-2">Times per day</label>
            <div className="flex items-center gap-4">
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                onClick={() => setNewTargetCount(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl bg-brand-secondary/40 flex items-center justify-center">
                <Minus size={16} className="text-brand-text/60" />
              </motion.button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-brand-text">{newTargetCount}</span>
                <p className="text-xs text-brand-text/40 mt-0.5">
                  {newTargetCount === 1 ? 'once a day' : `${newTargetCount}× a day`}
                </p>
              </div>
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                onClick={() => setNewTargetCount(c => Math.min(10, c + 1))}
                className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                <Plus size={16} className="text-brand-primary" />
              </motion.button>
            </div>
          </div>

          {/* Reminder section */}
          <div className="border-t border-brand-secondary/40 pt-4">
            <button
              type="button"
              onClick={() => setReminderEnabled(v => !v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${reminderEnabled ? 'bg-brand-primary/10 border border-brand-primary/30' : 'bg-brand-bg border border-brand-secondary/40'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reminderEnabled ? 'bg-brand-primary/20' : 'bg-brand-secondary/40'}`}>
                <Bell size={15} className={reminderEnabled ? 'text-brand-primary' : 'text-brand-text/40'} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${reminderEnabled ? 'text-brand-primary' : 'text-brand-text/60'}`}>Set Reminder</p>
                <p className="text-xs text-brand-text/40">Get notified for this task</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${reminderEnabled ? 'bg-brand-primary border-brand-primary' : 'border-brand-secondary'}`}>
                {reminderEnabled && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
            </button>

            <AnimatePresence>
              {reminderEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <Input label="Reminder Time" type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} />
                    <div>
                      <label className="block text-sm font-semibold text-brand-text/80 mb-2">Repeat</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['daily', 'weekly', 'monthly', 'once'] as RecurrenceType[]).map(r => (
                          <button key={r} type="button" onClick={() => setReminderRecurrence(r)}
                            className={`py-2 rounded-xl text-xs font-semibold transition-all capitalize ${reminderRecurrence === r ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text/70'}`}>
                            {RECURRENCE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button fullWidth onClick={handleAdd} disabled={!newLabel.trim() || addSaving}>
            {addSaving ? 'Adding…' : 'Add Task'}
          </Button>
        </div>
      </Modal>

      {/* ── Edit Task Modal ── */}
      <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-text/80 mb-2">Emoji</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} type="button" onClick={() => setEditEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl transition-all ${editEmoji === e ? 'bg-brand-primary/20 ring-2 ring-brand-primary' : 'bg-brand-bg'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Input label="Task Name" placeholder="e.g. Morning walk" value={editLabel}
            onChange={e => setEditLabel(e.target.value)} />
          <div>
            <label className="block text-sm font-semibold text-brand-text/80 mb-2">Times per day</label>
            <div className="flex items-center gap-4">
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                onClick={() => setEditTargetCount(c => Math.max(1, c - 1))}
                className="w-10 h-10 rounded-xl bg-brand-secondary/40 flex items-center justify-center">
                <Minus size={16} className="text-brand-text/60" />
              </motion.button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold text-brand-text">{editTargetCount}</span>
                <p className="text-xs text-brand-text/40 mt-0.5">
                  {editTargetCount === 1 ? 'once a day' : `${editTargetCount}× a day`}
                </p>
              </div>
              <motion.button type="button" whileTap={{ scale: 0.9 }}
                onClick={() => setEditTargetCount(c => Math.min(10, c + 1))}
                className="w-10 h-10 rounded-xl bg-brand-primary/20 flex items-center justify-center">
                <Plus size={16} className="text-brand-primary" />
              </motion.button>
            </div>
          </div>

          {/* Reminder section */}
          <div className="border-t border-brand-secondary/40 pt-4">
            <button
              type="button"
              onClick={() => setEditReminderEnabled(v => !v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${editReminderEnabled ? 'bg-brand-primary/10 border border-brand-primary/30' : 'bg-brand-bg border border-brand-secondary/40'}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editReminderEnabled ? 'bg-brand-primary/20' : 'bg-brand-secondary/40'}`}>
                <Bell size={15} className={editReminderEnabled ? 'text-brand-primary' : 'text-brand-text/40'} />
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-semibold ${editReminderEnabled ? 'text-brand-primary' : 'text-brand-text/60'}`}>Set Reminder</p>
                <p className="text-xs text-brand-text/40">Get notified for this task</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${editReminderEnabled ? 'bg-brand-primary border-brand-primary' : 'border-brand-secondary'}`}>
                {editReminderEnabled && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
            </button>

            <AnimatePresence>
              {editReminderEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 space-y-3">
                    <Input label="Reminder Time" type="time" value={editReminderTime} onChange={e => setEditReminderTime(e.target.value)} />
                    <div>
                      <label className="block text-sm font-semibold text-brand-text/80 mb-2">Repeat</label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['daily', 'weekly', 'monthly', 'once'] as RecurrenceType[]).map(r => (
                          <button key={r} type="button" onClick={() => setEditReminderRecurrence(r)}
                            className={`py-2 rounded-xl text-xs font-semibold transition-all capitalize ${editReminderRecurrence === r ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text/70'}`}>
                            {RECURRENCE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button fullWidth onClick={handleEditSave} disabled={!editLabel.trim() || editSaving}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
