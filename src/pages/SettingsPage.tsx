import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { usePregnancy } from '../hooks/usePregnancy'
import { useAppStore } from '../store/useAppStore'
import { db } from '../db/database'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { BLOOD_TYPES } from '../utils/constants'
import { getPregnancyWeek, getDaysUntil } from '../utils/dateUtils'
import { useToast } from '../components/ui/Toast'

export function SettingsPage() {
  const { profile } = usePregnancy()
  const { setProfile } = useAppStore()
  const { show } = useToast()

  const [firstName, setFirstName] = useState(profile?.firstName ?? '')
  const [dueDate, setDueDate] = useState(profile?.dueDate ?? '')
  const [doctorName, setDoctorName] = useState(profile?.doctorName ?? '')
  const [hospitalName, setHospitalName] = useState(profile?.hospitalName ?? '')
  const [bloodType, setBloodType] = useState(profile?.bloodType ?? 'O+')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  async function handleSave() {
    if (!profile?.id || saving) return
    setSaving(true)
    try {
      await db.pregnancyProfile.update(profile.id, { firstName, dueDate, doctorName, hospitalName, bloodType })
      const updated = await db.pregnancyProfile.get(profile.id)
      if (updated) setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      show('Could not save changes. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    try {
      await db.delete()
      localStorage.clear()
      window.location.reload()
    } catch {
      show('Reset failed. Please try again.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="Settings" />
      <div className="px-5 space-y-4 pb-8">

        {/* Profile */}
        <Card>
          <p className="font-bold text-brand-text mb-4">Profile</p>
          <div className="space-y-3">
            <Input label="Your Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            <Input label="Doctor's Name" value={doctorName} onChange={e => setDoctorName(e.target.value)} />
            <Input label="Hospital Name" value={hospitalName} onChange={e => setHospitalName(e.target.value)} />
            <div>
              <label className="block text-sm font-semibold text-brand-text/80 mb-2">Blood Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button key={bt} type="button" onClick={() => setBloodType(bt)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${bloodType === bt ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text'}`}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <motion.div className="mt-4">
            <Button fullWidth onClick={handleSave} disabled={saving || !firstName.trim() || !dueDate}>
              {saving ? 'Saving…' : saved ? '✅ Saved!' : 'Save Changes'}
            </Button>
          </motion.div>
        </Card>

        {/* Pregnancy Stats */}
        {profile && (
          <Card gradient>
            <p className="font-bold text-brand-text mb-3">Pregnancy Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-primary">{getPregnancyWeek(profile.dueDate)}</p>
                <p className="text-xs text-brand-text/50">Current Week</p>
              </div>
              <div className="bg-white/50 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-brand-primary">{Math.max(0, getDaysUntil(profile.dueDate))}</p>
                <p className="text-xs text-brand-text/50">Days Remaining</p>
              </div>
            </div>
          </Card>
        )}

        {/* App info */}
        <Card>
          <p className="font-bold text-brand-text mb-3">About</p>
          <div className="space-y-2 text-sm text-brand-text/60">
            <div className="flex justify-between">
              <span>App</span>
              <span className="font-semibold text-brand-text">Katyamma Care</span>
            </div>
            <div className="flex justify-between">
              <span>Version</span>
              <span className="font-semibold text-brand-text">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="font-semibold text-brand-text">Local (Offline)</span>
            </div>
            <div className="flex justify-between">
              <span>Privacy</span>
              <span className="font-semibold text-green-600">100% Private ✅</span>
            </div>
          </div>
        </Card>

        {/* Danger zone */}
        <Card className="border border-red-200">
          <p className="font-bold text-red-500 mb-1">Danger Zone</p>
          <p className="text-xs text-brand-text/50 mb-4">This will erase all your data permanently.</p>

          <AnimatePresence mode="wait">
            {!confirmReset ? (
              <motion.div key="trigger" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button variant="danger" fullWidth onClick={() => setConfirmReset(true)}>
                  Reset All Data
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-red-50 border border-red-200 p-4 space-y-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-700">Are you absolutely sure?</p>
                    <p className="text-xs text-red-500 mt-0.5">All journal entries, health logs, and profile data will be permanently deleted. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white border border-red-200 text-sm font-semibold text-brand-text/70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold"
                  >
                    Yes, Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  )
}
