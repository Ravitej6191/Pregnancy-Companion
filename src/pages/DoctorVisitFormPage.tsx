import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Trash2, AlertTriangle, Camera, X, ImagePlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useDoctorVisits } from '../hooks/useDoctorVisits'
import { usePregnancy } from '../hooks/usePregnancy'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Button } from '../components/ui/Button'
import { VISIT_TYPES } from '../utils/constants'
import { getTodayISO } from '../utils/dateUtils'
import { useToast } from '../components/ui/Toast'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { base64ToBlob } from '../utils/images'

const BP_PATTERN = /^\d{2,3}\/\d{2,3}$/

export function DoctorVisitFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { week, profile } = usePregnancy()
  const { visits, addVisit, updateVisit, deleteVisit } = useDoctorVisits()

  const existingId = id && id !== 'new' ? Number(id) : NaN
  const existing = !Number.isNaN(existingId) ? visits?.find(v => v.id === existingId) : undefined
  const { show } = useToast()

  const [date, setDate] = useState(getTodayISO())
  const [doctorName, setDoctorName] = useState('')
  const [visitType, setVisitType] = useState('Routine Checkup')
  const [weight, setWeight] = useState('')
  const [bp, setBp] = useState('')
  const [bpError, setBpError] = useState('')
  const [fhr, setFhr] = useState('')
  const [fhrError, setFhrError] = useState('')
  const [fundalHeight, setFundalHeight] = useState('')
  const [notes, setNotes] = useState('')
  const [nextVisit, setNextVisit] = useState('')
  const [image, setImage] = useState<Blob | undefined>()
  const imageUrl = useObjectUrl(image)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (existing) {
      setDate(existing.date || getTodayISO())
      setDoctorName(existing.doctorName || '')
      setVisitType(existing.visitType || 'Routine Checkup')
      setWeight(existing.weight > 0 ? String(existing.weight) : '')
      setBp(existing.bloodPressure || '')
      setFhr(existing.fetalHeartRate > 0 ? String(existing.fetalHeartRate) : '')
      setFundalHeight(existing.fundalHeight > 0 ? String(existing.fundalHeight) : '')
      setNotes(existing.notes || '')
      setNextVisit(existing.nextVisitDate || '')
      setImage(existing.image)
    } else {
      // Pre-fill doctor name from profile when adding a new visit
      if (profile?.doctorName) {
        setDoctorName(profile.doctorName)
      }
    }
  }, [existing, profile])

  function validateBp(value: string): string {
    if (!value) return ''
    if (!BP_PATTERN.test(value)) return 'Format: 120/80'
    return ''
  }

  function validateFhr(value: string): string {
    if (!value) return ''
    const n = Number(value)
    if (isNaN(n) || n < 60 || n > 220) return 'Normal range: 60–220 bpm'
    return ''
  }

  async function handlePickImage() {
    // Request permissions separately — a permission error must not block getPhoto
    try {
      await CapCamera.requestPermissions({ permissions: ['camera', 'photos'] })
    } catch {
      // Permission API may not exist on all platforms — ignore and attempt getPhoto anyway
    }
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 80,
        width: 1200,
        height: 1600,
        correctOrientation: true,
      })
      if (!photo.base64String) return
      setImage(base64ToBlob(photo.base64String, photo.format))
      show('Photo attached', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg && !msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss') && !msg.toLowerCase().includes('no image')) {
        show('Could not open camera. Check permissions.', 'error')
      }
    }
  }

  async function handleSave() {
    const bpErr = validateBp(bp)
    const fhrErr = validateFhr(fhr)
    setBpError(bpErr)
    setFhrError(fhrErr)
    if (bpErr || fhrErr) return

    setSaving(true)
    const data = {
      date, weekNumber: week, doctorName, visitType,
      weight: parseFloat(weight) || 0, bloodPressure: bp,
      fetalHeartRate: parseInt(fhr) || 0, fundalHeight: parseFloat(fundalHeight) || 0,
      notes, nextVisitDate: nextVisit,
      image,
    }
    try {
      if (existing?.id) { await updateVisit(existing.id, data); show('Visit updated!', 'success') }
      else { await addVisit(data); show('Visit logged!', 'success') }
      navigate('/doctor-visits')
    } catch {
      show('Could not save visit. Try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!existing?.id) return
    try {
      await deleteVisit(existing.id)
      show('Visit deleted', 'info')
      navigate('/doctor-visits')
    } catch {
      show('Could not delete visit.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title={existing ? 'Edit Visit' : 'Log Visit'}
        right={existing && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setConfirmDelete(true)} aria-label="Delete visit" className="w-10 h-10 flex items-center justify-center rounded-xl">
            <Trash2 size={18} className="text-red-400" />
          </motion.button>
        )}
      />

      {/* Delete confirmation */}
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
                <p className="text-sm font-semibold text-red-700">Delete this visit log?</p>
                <p className="text-xs text-red-500 mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl bg-white border border-red-200 text-sm font-semibold text-brand-text/70">Cancel</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold">Delete</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 space-y-4 pb-8">

        <Card>
          <div className="space-y-4">
            <Input label="Visit Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input
              label="Doctor's Name"
              placeholder="Dr. Sharma"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
            />
            {profile?.doctorName && !existing && doctorName === profile.doctorName && (
              <p className="text-[11px] text-brand-primary/60 -mt-2">Pre-filled from your profile</p>
            )}
            <div>
              <label className="block text-sm font-semibold text-brand-text/80 mb-2">Visit Type</label>
              <div className="flex flex-wrap gap-2">
                {VISIT_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setVisitType(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${visitType === t ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="font-bold text-brand-text mb-3">Measurements</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" step="0.1" placeholder="65.5" value={weight} onChange={e => setWeight(e.target.value)} />
            <div>
              <Input
                label="Blood Pressure"
                placeholder="e.g. 120/80"
                value={bp}
                onChange={e => { setBp(e.target.value); if (bpError) setBpError(validateBp(e.target.value)) }}
                onBlur={e => setBpError(validateBp(e.target.value))}
                error={bpError}
              />
              {!bpError && (
                <p className="text-[11px] text-brand-text/40 mt-1 ml-1">Format: systolic/diastolic (e.g. 120/80)</p>
              )}
            </div>
            <div>
              <Input
                label="Fetal Heart Rate"
                type="number"
                placeholder="e.g. 140"
                value={fhr}
                onChange={e => { setFhr(e.target.value); if (fhrError) setFhrError(validateFhr(e.target.value)) }}
                onBlur={e => setFhrError(validateFhr(e.target.value))}
                error={fhrError}
              />
            </div>
            <Input label="Fundal Height (cm)" type="number" placeholder="22" value={fundalHeight} onChange={e => setFundalHeight(e.target.value)} />
          </div>
        </Card>

        <Card>
          <Textarea label="Notes" placeholder="What did the doctor say? Any concerns?" value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
        </Card>

        {/* Medical Image / Receipt Upload */}
        <Card>
          <p className="font-bold text-brand-text mb-3">Attach Photo</p>
          <p className="text-xs text-brand-text/40 mb-3">Save prescription, test report, or medical receipt</p>
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt="Attached photo"
                className="w-full rounded-2xl object-cover max-h-64"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handlePickImage}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-secondary/40 text-sm font-semibold text-brand-text"
                >
                  <Camera size={14} className="text-brand-primary" />
                  Replace
                </button>
                <button
                  onClick={() => { setImage(undefined) }}
                  className="w-11 flex items-center justify-center rounded-xl bg-red-50"
                  aria-label="Remove photo"
                >
                  <X size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePickImage}
              className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed border-brand-secondary/60 bg-brand-secondary/10 text-brand-text/50"
            >
              <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                <ImagePlus size={22} className="text-brand-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-brand-text/60">Tap to add photo</p>
                <p className="text-xs text-brand-text/30 mt-0.5">Prescription, report, or receipt</p>
              </div>
            </motion.button>
          )}
        </Card>

        <Card>
          <Input label="Next Visit Date" type="date" value={nextVisit} onChange={e => setNextVisit(e.target.value)} />
        </Card>

        <Button fullWidth size="lg" onClick={handleSave} disabled={saving || !date}>
          {saving ? 'Saving...' : existing ? 'Update Visit' : 'Save Visit'}
        </Button>
      </div>
    </div>
  )
}
