import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Bell, Droplets, Pill, Baby, Footprints, Moon, FileText, Hospital, Pencil } from 'lucide-react'
import { useReminders } from '../hooks/useReminders'
import { buildNextOccurrence } from '../notifications/notificationService'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Toggle } from '../components/ui/Toggle'
import { EmptyState } from '../components/ui/EmptyState'
import { REMINDER_CATEGORIES } from '../utils/constants'
import { useToast } from '../components/ui/Toast'
import type { Reminder, RecurrenceType } from '../types'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  appointment: <Hospital size={16} className="text-cyan-600" />,
  water: <Droplets size={16} className="text-blue-500" />,
  vitamins: <Pill size={16} className="text-violet-500" />,
  'kick-count': <Baby size={16} className="text-brand-primary" />,
  walk: <Footprints size={16} className="text-orange-500" />,
  sleep: <Moon size={16} className="text-indigo-500" />,
  custom: <FileText size={16} className="text-brand-text/60" />,
}

const CATEGORY_BG: Record<string, string> = {
  appointment: 'bg-cyan-50',
  water: 'bg-blue-50',
  vitamins: 'bg-violet-50',
  'kick-count': 'bg-pink-50',
  walk: 'bg-orange-50',
  sleep: 'bg-indigo-50',
  custom: 'bg-brand-secondary/40',
}

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  once: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

function ReminderForm({
  title, setTitle,
  body, setBody,
  time, setTime,
  recurrence, setRecurrence,
  category, setCategory,
  saving,
  onSave,
  saveLabel,
}: {
  title: string; setTitle: (v: string) => void
  body: string; setBody: (v: string) => void
  time: string; setTime: (v: string) => void
  recurrence: RecurrenceType; setRecurrence: (v: RecurrenceType) => void
  category: string; setCategory: (v: string) => void
  saving: boolean
  onSave: () => void
  saveLabel: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-brand-text/80 mb-2">Category</label>
        <div className="grid grid-cols-4 gap-2">
          {REMINDER_CATEGORIES.map(c => {
            const icon = CATEGORY_ICONS[c.value] ?? <Bell size={16} className="text-brand-primary" />
            const bg = CATEGORY_BG[c.value] ?? 'bg-brand-secondary/40'
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => { setCategory(c.value); if (!title || REMINDER_CATEGORIES.some(rc => rc.label === title)) setTitle(c.label) }}
                className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-[10px] font-semibold transition-all ${category === c.value ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text/70'}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${category === c.value ? 'bg-white/20' : bg}`}>
                  {icon}
                </div>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>
      <Input label="Reminder Title" placeholder="e.g. Take prenatal vitamins" value={title} onChange={e => setTitle(e.target.value)} />
      <Input label="Note (optional)" placeholder="e.g. With breakfast" value={body} onChange={e => setBody(e.target.value)} />
      <Input label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
      <div>
        <label className="block text-sm font-semibold text-brand-text/80 mb-2">Repeat</label>
        <div className="grid grid-cols-4 gap-2">
          {(['once', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map(r => (
            <button key={r} type="button" onClick={() => setRecurrence(r)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${recurrence === r ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text'}`}>
              {RECURRENCE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <Button fullWidth onClick={onSave} disabled={!title.trim() || saving}>
        {saving ? 'Saving...' : saveLabel}
      </Button>
    </div>
  )
}

export function RemindersPage() {
  const { reminders, addReminder, toggleReminder, deleteReminder, updateReminder } = useReminders()
  const { show } = useToast()

  // Add state
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addBody, setAddBody] = useState('')
  const [addTime, setAddTime] = useState('09:00')
  const [addRecurrence, setAddRecurrence] = useState<RecurrenceType>('daily')
  const [addCategory, setAddCategory] = useState('vitamins')
  const [addSaving, setAddSaving] = useState(false)

  // Edit state
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editTime, setEditTime] = useState('09:00')
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>('daily')
  const [editCategory, setEditCategory] = useState('vitamins')
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(r: Reminder) {
    setEditingReminder(r)
    setEditTitle(r.title)
    setEditBody(r.body)
    const d = new Date(r.scheduledAt)
    setEditTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)
    setEditRecurrence(r.recurrence)
    setEditCategory(r.category)
  }

  async function handleAdd() {
    if (!addTitle.trim()) return
    setAddSaving(true)
    const nextOccurrence = buildNextOccurrence(addTime)
    try {
      await addReminder({
        title: addTitle,
        body: addBody || addTitle,
        scheduledAt: nextOccurrence.toISOString(),
        recurrence: addRecurrence,
        recurrenceDays: [],
        isActive: true,
        category: addCategory,
      })
      show('Reminder saved!', 'success')
      setAddTitle(''); setAddBody(''); setAddTime('09:00'); setAddRecurrence('daily'); setAddCategory('vitamins')
      setShowAdd(false)
    } catch {
      show('Could not save reminder. Try again.', 'error')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleEdit() {
    if (!editingReminder?.id || !editTitle.trim()) return
    setEditSaving(true)
    const nextOccurrence = buildNextOccurrence(editTime)
    try {
      await updateReminder(editingReminder.id, editingReminder, {
        title: editTitle,
        body: editBody || editTitle,
        scheduledAt: nextOccurrence.toISOString(),
        recurrence: editRecurrence,
        recurrenceDays: [],
        isActive: editingReminder.isActive,
        category: editCategory,
      })
      show('Reminder saved!', 'success')
      setEditingReminder(null)
    } catch {
      show('Could not update reminder.', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Reminders"
        right={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={16} className="inline mr-1" /> Add
          </Button>
        }
      />
      <div className="px-5 pb-8">
        {reminders === undefined ? (
          <div className="flex justify-center mt-20">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-brand-primary"
                  animate={{ scale: [1,1.5,1], opacity: [0.4,1,0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
          </div>
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} className="text-brand-primary" />}
            title="No reminders set"
            subtitle="Add gentle reminders for vitamins, water, and doctor visits"
            action={<Button onClick={() => setShowAdd(true)}>Add Reminder</Button>}
          />
        ) : (
          <div className="space-y-3">
            {reminders.map((r, i) => {
              const catBg = CATEGORY_BG[r.category] ?? 'bg-brand-secondary/40'
              const catIcon = CATEGORY_ICONS[r.category] ?? <Bell size={16} className="text-brand-primary" />
              const recurrenceLabel = RECURRENCE_LABELS[r.recurrence] ?? r.recurrence
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Card className={r.isActive ? '' : 'opacity-60'}>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl ${catBg} flex items-center justify-center flex-shrink-0`}>
                        {catIcon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-brand-text text-sm truncate">{r.title}</p>
                        <p className="text-xs text-brand-text/50">
                          {recurrenceLabel} ·{' '}
                          {new Date(r.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Toggle
                          checked={r.isActive}
                          onChange={async () => {
                            if (!r.id) return
                            try {
                              await toggleReminder(r.id, r)
                              show(r.isActive ? 'Reminder paused' : 'Reminder enabled', 'info')
                            } catch {
                              show('Could not update reminder', 'error')
                            }
                          }}
                          size="sm"
                        />
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEdit(r)}
                          aria-label="Edit reminder"
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-brand-secondary/40 transition-colors"
                        >
                          <Pencil size={13} className="text-brand-text/40" />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={async () => {
                            if (!r.id) return
                            try {
                              await deleteReminder(r.id, r.capacitorNotificationId)
                              show('Reminder removed', 'info')
                            } catch {
                              show('Could not remove reminder', 'error')
                            }
                          }}
                          aria-label="Delete reminder"
                          className="w-7 h-7 flex items-center justify-center"
                        >
                          <Trash2 size={14} className="text-red-300" />
                        </motion.button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Reminder">
        <ReminderForm
          title={addTitle} setTitle={setAddTitle}
          body={addBody} setBody={setAddBody}
          time={addTime} setTime={setAddTime}
          recurrence={addRecurrence} setRecurrence={setAddRecurrence}
          category={addCategory} setCategory={setAddCategory}
          saving={addSaving}
          onSave={handleAdd}
          saveLabel="Set Reminder"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingReminder} onClose={() => setEditingReminder(null)} title="Edit Reminder">
        <ReminderForm
          title={editTitle} setTitle={setEditTitle}
          body={editBody} setBody={setEditBody}
          time={editTime} setTime={setEditTime}
          recurrence={editRecurrence} setRecurrence={setEditRecurrence}
          category={editCategory} setCategory={setEditCategory}
          saving={editSaving}
          onSave={handleEdit}
          saveLabel="Save Changes"
        />
      </Modal>
    </div>
  )
}
