import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, Trash2 } from 'lucide-react'
import { useUltrasound } from '../hooks/useUltrasound'
import { usePregnancy } from '../hooks/usePregnancy'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { resizeImageToBlob } from '../utils/images'
import { getTodayISO } from '../utils/dateUtils'
import { useObjectUrl } from '../hooks/useObjectUrl'

export function UltrasoundAlbumPage() {
  const { week } = usePregnancy()
  const { photos, addPhoto, deletePhoto } = useUltrasound()
  const { show } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [viewPhoto, setViewPhoto] = useState<Blob | null>(null)
  const [photo, setPhoto] = useState<Blob | undefined>()
  const photoPreviewUrl = useObjectUrl(photo)
  const viewUrl = useObjectUrl(viewPhoto)
  const [caption, setCaption] = useState('')
  const [date, setDate] = useState(getTodayISO())
  const [gestationalAge, setGestationalAge] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setPhoto(await resizeImageToBlob(file))
    } catch {
      show('Could not process image. Try again.', 'error')
    }
  }

  async function handleSave() {
    if (!photo) return
    setSaving(true)
    try {
      await addPhoto({
        date,
        weekNumber: week,
        photo,
        caption,
        gestationalAge: gestationalAge || `${week} weeks`,
      })
      show('Photo saved!', 'success')
      setPhoto(undefined)
      setCaption('')
      setGestationalAge('')
      setDate(getTodayISO())
      setShowAdd(false)
    } catch {
      show('Could not save photo. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePhoto(id)
      show('Photo deleted', 'info')
    } catch {
      show('Could not delete photo.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Ultrasound Album"
        right={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Camera size={16} className="inline mr-1" /> Add
          </Button>
        }
      />
      <div className="px-5 pb-8">
        {!photos || photos.length === 0 ? (
          <EmptyState
            icon={<Camera size={30} className="text-brand-primary/60" />}
            title="No ultrasound photos yet"
            subtitle="Add your first ultrasound memory"
            action={<Button onClick={() => setShowAdd(true)}>Add Photo</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card noPad className="overflow-hidden cursor-pointer" whileTap={{ scale: 0.97 }} onClick={() => setViewPhoto(photo.photo)}>
                  <div className="h-44 bg-gray-100 relative">
                    <UltrasoundThumb blob={photo.photo} alt={photo.caption} />
                    <button
                      onClick={e => { e.stopPropagation(); photo.id && handleDelete(photo.id) }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-brand-primary">{photo.gestationalAge}</p>
                    <p className="text-xs text-brand-text/60 mt-0.5 line-clamp-2">{photo.caption || 'No caption'}</p>
                    <p className="text-[10px] text-brand-text/40 mt-1">{new Date(photo.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Ultrasound">
        <div className="space-y-4">
          {photoPreviewUrl ? (
            <div className="relative rounded-2xl overflow-hidden h-48">
              <img src={photoPreviewUrl} alt="Ultrasound" className="w-full h-full object-cover" />
              <button onClick={() => setPhoto(undefined)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white">
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-36 bg-brand-bg rounded-2xl border-2 border-dashed border-brand-secondary cursor-pointer gap-2">
              <Camera size={28} className="text-brand-primary" />
              <span className="text-sm text-brand-text/50 font-medium">Tap to select photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          )}
          <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Input label="Gestational Age" placeholder="e.g. 20 weeks 3 days" value={gestationalAge} onChange={e => setGestationalAge(e.target.value)} />
          <Input label="Caption (optional)" placeholder="e.g. First heartbeat ❤️" value={caption} onChange={e => setCaption(e.target.value)} />
          <Button fullWidth onClick={handleSave} disabled={!photo || saving}>
            {saving ? 'Saving...' : 'Save Memory'}
          </Button>
        </div>
      </Modal>

      {/* Full-screen viewer */}
      <AnimatePresence>
        {viewPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
            onClick={() => setViewPhoto(null)}
          >
            <img src={viewUrl} alt="Ultrasound full" className="max-w-full max-h-full object-contain" />
            <button className="absolute top-8 right-5 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UltrasoundThumb({ blob, alt }: { blob: Blob; alt: string }) {
  const url = useObjectUrl(blob)
  return <img src={url} alt={alt} className="w-full h-full object-cover" />
}
