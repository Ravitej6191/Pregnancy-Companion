import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Camera, AlertTriangle } from 'lucide-react'
import { useJournal } from '../hooks/useJournal'
import { usePregnancy } from '../hooks/usePregnancy'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Textarea } from '../components/ui/Textarea'
import { MOODS, SYMPTOMS } from '../utils/constants'
import { getTodayISO } from '../utils/dateUtils'
import { resizeImageToBlob } from '../utils/images'
import { useToast } from '../components/ui/Toast'
import type { MoodValue } from '../types'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function JournalFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { week } = usePregnancy()
  const { entries, saveEntry, updateEntry, deleteEntry } = useJournal()
  const { show } = useToast()

  const existingEntry = id ? entries?.find(e => e.id === parseInt(id)) : undefined

  const [mood, setMood] = useState<MoodValue>('good')
  const [notes, setNotes] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [photo, setPhoto] = useState<Blob | undefined>()
  const photoUrl = useObjectUrl(photo)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (existingEntry) {
      setMood(existingEntry.mood)
      setNotes(existingEntry.notes)
      setSymptoms(existingEntry.symptoms ?? [])
      setPhoto(existingEntry.photo)
    }
  }, [existingEntry])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await resizeImageToBlob(file))
    } catch {
      show('Could not process image. Try again.', 'error')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const moodScore = MOODS.find(m => m.value === mood)?.score ?? 3
      if (existingEntry?.id) {
        await updateEntry(existingEntry.id, { mood, moodScore, notes, symptoms, photo })
        show('Entry updated!', 'success')
      } else {
        await saveEntry({
          date: getTodayISO(),
          weekNumber: week,
          mood,
          moodScore,
          notes,
          symptoms,
          photo,
        })
        show('Journal entry saved!', 'success')
      }
      navigate(-1)
    } catch {
      show('Could not save entry. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!existingEntry?.id) return
    try {
      await deleteEntry(existingEntry.id)
      show('Entry deleted', 'info')
      navigate(-1)
    } catch {
      show('Could not delete entry.', 'error')
    }
  }

  function toggleSymptom(s: string) {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title={existingEntry ? 'Edit Entry' : 'New Entry'}
        right={existingEntry && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete entry"
            className="w-10 h-10 flex items-center justify-center rounded-xl"
          >
            <Trash2 size={18} className="text-red-400" />
          </motion.button>
        )}
      />

      {/* Delete confirmation banner */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 mb-2 rounded-xl bg-red-50 border border-red-200 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">Delete this entry?</p>
                <p className="text-xs text-red-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl bg-white border border-red-200 text-sm font-semibold text-brand-text/70"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 space-y-4 pb-8">

        {/* Mood */}
        <Card gradient>
          <p className="font-bold text-brand-text mb-3">How are you feeling?</p>
          <div className="flex justify-between gap-2">
            {MOODS.map(m => {
              const isSelected = mood === m.value
              return (
                <motion.button
                  key={m.value}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setMood(m.value as MoodValue)}
                  aria-label={m.label}
                  aria-pressed={isSelected}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${isSelected ? 'ring-2 ring-brand-primary scale-105' : 'bg-brand-bg'}`}
                  style={{ backgroundColor: isSelected ? `${m.color}22` : undefined }}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] font-semibold text-brand-text/60 leading-tight text-center">{m.label}</span>
                </motion.button>
              )
            })}
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <Textarea
            label="What's on your mind?"
            placeholder="Write about how you're feeling, what baby has been doing, your thoughts..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
          />
        </Card>

        {/* Symptoms */}
        <Card>
          <p className="font-bold text-brand-text mb-3">Symptoms today</p>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map(s => (
              <motion.button
                key={s}
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleSymptom(s)}
                aria-pressed={symptoms.includes(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${symptoms.includes(s) ? 'bg-brand-primary text-white' : 'bg-brand-secondary/50 text-brand-text/70'}`}
              >
                {s}
              </motion.button>
            ))}
          </div>
        </Card>

        {/* Photo */}
        <Card>
          <p className="font-bold text-brand-text mb-3">Add a photo</p>
          {photoUrl ? (
            <div className="relative rounded-xl overflow-hidden mb-3 h-48">
              <img src={photoUrl} alt="Journal entry photo" className="w-full h-full object-cover" />
              <button
                onClick={() => setPhoto(undefined)}
                aria-label="Remove photo"
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 bg-brand-bg rounded-xl border-2 border-dashed border-brand-secondary cursor-pointer gap-2">
              <Camera size={24} className="text-brand-primary" />
              <span className="text-xs text-brand-text/50 font-medium">Tap to add photo</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </label>
          )}
        </Card>

        <Button fullWidth size="lg" onClick={handleSave} disabled={saving || (!notes.trim() && !photo && !existingEntry)}>
          {saving ? 'Saving...' : existingEntry ? 'Update Entry' : 'Save Entry'}
        </Button>
        {!notes.trim() && !photo && !existingEntry && (
          <p className="text-center text-xs text-brand-text/40">Write something or add a photo to save your entry</p>
        )}
      </div>
    </div>
  )
}
