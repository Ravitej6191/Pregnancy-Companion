import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Check, Calendar, Heart, User, AlertTriangle, Pencil, Download, Loader, Camera, Lock, Fingerprint, KeyRound, Shield, Cloud, CloudOff, RefreshCw, LogOut, CloudDownload, CloudUpload } from 'lucide-react'
import { usePregnancy } from '../hooks/usePregnancy'
import { useAppStore } from '../store/useAppStore'
import { db } from '../db/database'
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Modal } from '../components/ui/Modal'
import { BLOOD_TYPES } from '../utils/constants'
import { getTrimester } from '../utils/dateUtils'
import { useToast } from '../components/ui/Toast'
import { useAuthStore } from '../store/useAuthStore'
import { signInWithGoogle, signOutGoogle } from '../services/googleAuth'
import { pushToCloud, pullFromCloud, deleteFromCloud } from '../services/syncService'
import { cancelAllReminders } from '../notifications/notificationService'
import { isFirebaseConfigured } from '../config/firebase'
import { PIN_LENGTH, savePin, hasPin } from '../utils/appLock'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { base64ToBlob } from '../utils/images'

function formatLastSynced(isoString: string | null): string {
  if (!isoString) return 'Not yet backed up'
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

export function ProfilePage() {
  const { profile, week, daysRemaining, progress, babySize } = usePregnancy()
  const { setProfile } = useAppStore()
  const { show } = useToast()
  const { user, isSigningIn, syncing, lastSyncedAt, syncError, setSyncError } = useAuthStore()

  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmReset, setConfirmReset] = useState<false | 'local' | 'full'>(false)
  const [firstName, setFirstName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [bloodType, setBloodType] = useState('O+')
  const [photo, setPhoto] = useState<Blob | undefined>()
  const photoUrl = useObjectUrl(photo)

  // App Lock settings
  const [lockEnabled, setLockEnabled] = useState(() => localStorage.getItem('appLockEnabled') === 'true')
  const [biometricEnabled, setBiometricEnabled] = useState(() => localStorage.getItem('appLockBiometricEnabled') === 'true')
  const [showSetPin, setShowSetPin] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter')

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName)
      setDueDate(profile.dueDate)
      setDoctorName(profile.doctorName || '')
      setHospitalName(profile.hospitalName || '')
      setBloodType(profile.bloodType || 'O+')
      setPhoto(profile.photo)
    }
  }, [profile])

  async function handleSave() {
    if (!profile?.id || savingProfile) return
    if (!firstName.trim()) { show('Name cannot be empty.', 'error'); return }
    if (!dueDate) { show('Due date is required.', 'error'); return }
    setSavingProfile(true)
    try {
      await db.pregnancyProfile.update(profile.id, { firstName: firstName.trim(), dueDate, doctorName, hospitalName, bloodType, photo })
      const updated = await db.pregnancyProfile.get(profile.id)
      if (updated) setProfile(updated)
      setEditing(false)
      show('Profile saved!', 'success')
    } catch {
      show('Could not save profile.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handlePickPhoto() {
    // Request permissions separately — don't let a permission error block getPhoto
    try {
      await CapCamera.requestPermissions({ permissions: ['camera', 'photos'] })
    } catch {
      // Permission API might not exist on all platforms — ignore and try anyway
    }
    try {
      const photo = await CapCamera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 80,
        width: 400,
        height: 400,
        correctOrientation: true,
      })
      if (!photo.base64String) {
        show('No photo returned. Try again.', 'error')
        return
      }
      const blob = base64ToBlob(photo.base64String, photo.format)
      // Update state immediately for instant UI feedback
      setPhoto(blob)
      // Persist to DB and global store so Dashboard also shows new photo
      if (profile?.id) {
        await db.pregnancyProfile.update(profile.id, { photo: blob })
        const updated = await db.pregnancyProfile.get(profile.id)
        if (updated) setProfile(updated)
        show('Profile photo updated!', 'success')
      }
    } catch (err: unknown) {
      const msg = String(err).toLowerCase()
      // Ignore user-initiated cancellations — only surface real errors
      if (!msg.includes('cancel') && !msg.includes('dismiss') && !msg.includes('denied') && !msg.includes('no image')) {
        show('Could not open camera. Check permissions in Settings.', 'error')
      }
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const { exportHealthReportPDF } = await import('../utils/exportPDF')
      await exportHealthReportPDF(
        profile?.firstName ?? 'Patient',
        week,
        daysRemaining,
        profile?.dueDate ?? '',
        profile?.doctorName ?? '',
        profile?.hospitalName ?? '',
        profile?.bloodType ?? ''
      )
      show('PDF exported!', 'success')
    } catch {
      show('Could not export PDF.', 'error')
    } finally {
      setExporting(false)
    }
  }

  async function handleReset(type: 'local' | 'full') {
    try {
      // Cancel all OS-level alarms first so no notifications fire after reset
      await cancelAllReminders().catch(() => {})
      if (type === 'full') {
        await deleteFromCloud().catch(() => {})
        await signOutGoogle().catch(() => {})
      }
      await db.delete()
      localStorage.clear()
      window.location.reload()
    } catch {
      show('Reset failed. Please try again.', 'error')
    }
  }

  function toggleLock(enabled: boolean) {
    if (enabled && !hasPin()) {
      setShowSetPin(true)
      return
    }
    setLockEnabled(enabled)
    localStorage.setItem('appLockEnabled', String(enabled))
    show(enabled ? 'App lock enabled' : 'App lock disabled', 'info')
  }

  function toggleBiometric(enabled: boolean) {
    setBiometricEnabled(enabled)
    localStorage.setItem('appLockBiometricEnabled', String(enabled))
    show(enabled ? 'Fingerprint enabled' : 'Fingerprint disabled', 'info')
  }

  async function handlePinDigit(d: string) {
    if (pinStep === 'enter') {
      const next = pinInput + d
      setPinInput(next)
      if (next.length === PIN_LENGTH) {
        setPinStep('confirm')
        setPinConfirm('')
      }
    } else {
      const next = pinConfirm + d
      setPinConfirm(next)
      if (next.length === PIN_LENGTH) {
        if (next === pinInput) {
          // salted PBKDF2 hash + length are stored by utils/appLock
          await savePin(next)
          localStorage.setItem('appLockEnabled', 'true')
          setLockEnabled(true)
          setShowSetPin(false)
          setPinInput('')
          setPinConfirm('')
          setPinStep('enter')
          show('PIN set! App lock enabled.', 'success')
        } else {
          setPinInput('')
          setPinConfirm('')
          setPinStep('enter')
          show('PINs did not match. Try again.', 'error')
        }
      }
    }
  }

  function handlePinBackspace() {
    if (pinStep === 'enter') setPinInput(p => p.slice(0, -1))
    else setPinConfirm(p => p.slice(0, -1))
  }

  async function handleGoogleSignIn() {
    setSyncError(null)
    try {
      await signInWithGoogle()
      show('Signed in! Backing up your data…', 'success')
      // Auto-backup immediately after sign-in
      try { await pushToCloud() } catch (err) { console.warn('[sync] post-sign-in sync failed', err) }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        show('Sign-in failed. Please try again.', 'error')
      }
    }
  }

  async function handleGoogleSignOut() {
    await signOutGoogle()
    show('Signed out', 'info')
  }

  async function handleBackup() {
    setSyncError(null)
    try {
      await pushToCloud()
      show('Synced with Google!', 'success')
    } catch (err) {
      show(err instanceof Error && err.message.includes('authorised') ? err.message : 'Sync failed. Check your connection.', 'error')
    }
  }

  async function handleRestore() {
    setSyncError(null)
    try {
      const { restored } = await pullFromCloud()
      // Merge-only: newer local data is never overwritten, so no confirmation or reload is needed.
      show(restored ? 'Merged changes from Google.' : 'Already up to date.', restored ? 'success' : 'info')
    } catch (err) {
      show(err instanceof Error && err.message.includes('authorised') ? err.message : 'Sync failed. Check your connection.', 'error')
    }
  }

  const trimNum = getTrimester(week)
  const trimLabel = trimNum === 1 ? '1st Trimester' : trimNum === 2 ? '2nd Trimester' : '3rd Trimester'
  const trimColor = trimNum === 1 ? '#FF8FAB' : trimNum === 2 ? '#A78BFA' : '#34D399'
  const trimBg = trimNum === 1 ? 'from-pink-50 to-rose-50' : trimNum === 2 ? 'from-purple-50 to-violet-50' : 'from-green-50 to-emerald-50'

  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader
        title="Profile"
        right={
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={savingProfile}
            className="w-9 h-9 rounded-xl bg-white shadow-soft flex items-center justify-center disabled:opacity-50"
          >
            {editing
              ? <Check size={18} className="text-green-500" />
              : <Edit2 size={15} className="text-brand-primary" />
            }
          </motion.button>
        }
      />

      <div className="px-5 space-y-3 pb-8">

        {/* Avatar + name */}
        <Card gradient className="text-center py-6">
          {/* Avatar wrapper — outer div has no overflow-hidden so badge is not clipped */}
          <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={handlePickPhoto}
            className="w-20 h-20 rounded-full mx-auto mb-3 cursor-pointer relative"
          >
            {/* Circle image area — overflow-hidden lives here only */}
            <div className="w-20 h-20 rounded-full bg-brand-primary/15 flex items-center justify-center overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={36} className="text-brand-primary" />
              )}
            </div>
            {/* Tap overlay — sits on top of the circle */}
            <div className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
              <Camera size={18} className="text-white" />
            </div>
            {/* Camera badge — outside the overflow container so it renders fully */}
            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-brand-primary rounded-full flex items-center justify-center shadow-md border-2 border-white">
              <Camera size={11} className="text-white" />
            </div>
          </motion.div>
          {editing ? (
            <div className="max-w-[200px] mx-auto">
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="text-center font-bold" placeholder="Your name" />
            </div>
          ) : (
            <h2 className="text-xl font-bold text-brand-text">{profile?.firstName}</h2>
          )}
          <p className="text-sm font-semibold mt-1" style={{ color: trimColor }}>{trimLabel}</p>
          <p className="text-xs text-brand-text/40 mt-0.5">Week {week} · {daysRemaining} days to go</p>
          {!editing && <p className="text-[10px] text-brand-primary/50 mt-1.5 font-medium">Tap to edit profile</p>}
        </Card>

        {/* Pregnancy progress */}
        <Card className={`bg-gradient-to-br ${trimBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-brand-text">{week}</p>
              <p className="text-xs text-brand-text/50">weeks pregnant</p>
            </div>
            <div className="text-center">
              <div className="text-4xl">{babySize?.emoji}</div>
              <p className="text-xs text-brand-text/50 mt-0.5">Size of a {babySize?.name}</p>
            </div>
          </div>
          <ProgressBar progress={progress} label={`${week}/40 weeks`} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { label: 'Trimester', value: `${trimNum}${trimNum===1?'st':trimNum===2?'nd':'rd'}`, color: trimColor },
              { label: 'Week', value: `${week}`, color: '#FF8FAB' },
              { label: 'Days Left', value: `${daysRemaining}`, color: '#60A5FA' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/60 rounded-xl p-2.5 text-center">
                <p className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] text-brand-text/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Due date */}
        <Card onClick={() => !editing && setEditing(true)}>
          <div className="flex items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-secondary/50 flex items-center justify-center">
                <Calendar size={15} className="text-brand-primary" />
              </div>
              <p className="font-bold text-brand-text text-sm">Due Date</p>
            </div>
            {!editing && <Pencil size={12} className="text-brand-text/25" />}
          </div>
          {editing ? (
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          ) : (
            <p className="text-brand-primary font-bold text-sm">
              {profile?.dueDate
                ? new Date(profile.dueDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : '—'}
            </p>
          )}
        </Card>

        {/* Medical info */}
        <Card onClick={() => !editing && setEditing(true)}>
          <div className="flex items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Heart size={15} className="text-red-400" />
              </div>
              <p className="font-bold text-brand-text text-sm">Medical Info</p>
            </div>
            {!editing && <Pencil size={12} className="text-brand-text/25" />}
          </div>
          {editing ? (
            <div className="space-y-3">
              <Input label="Doctor's Name" value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Sharma" />
              <Input label="Hospital Name" value={hospitalName} onChange={e => setHospitalName(e.target.value)} placeholder="Apollo Hospital" />
              <div>
                <label className="block text-xs font-bold text-brand-text/50 uppercase tracking-wide mb-2">Blood Type</label>
                <div className="flex flex-wrap gap-2">
                  {BLOOD_TYPES.map(bt => (
                    <button key={bt} type="button" onClick={() => setBloodType(bt)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${bloodType === bt ? 'bg-brand-primary text-white' : 'bg-brand-secondary/40 text-brand-text'}`}>
                      {bt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-brand-secondary/30">
              {[
                { label: 'Doctor', value: profile?.doctorName || 'Not set' },
                { label: 'Hospital', value: profile?.hospitalName || 'Not set' },
                { label: 'Blood Type', value: profile?.bloodType || 'Not set' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5">
                  <span className="text-xs text-brand-text/50 font-medium">{item.label}</span>
                  <span className="text-sm font-bold text-brand-text">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {editing && (
          <Button fullWidth size="lg" onClick={handleSave} disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </Button>
        )}

        {/* About — removed as requested */}

        {/* Export */}
        {!editing && (
          <Card>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-secondary/50 flex items-center justify-center">
                <Download size={15} className="text-brand-primary" />
              </div>
              <p className="font-bold text-brand-text text-sm">Export for Doctor</p>
            </div>
            <p className="text-xs text-brand-text/40 mb-3">Generate a PDF with all your health data, organized for medical review.</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full py-3 rounded-xl bg-brand-primary text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            >
              {exporting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export Health Report
                </>
              )}
            </button>
          </Card>
        )}

        {/* Google Account — minimal banner */}
        {!editing && isFirebaseConfigured && (
          user ? (
            /* Signed in — subtle status row */
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Cloud size={13} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-green-700">Google backup active</p>
                <p className="text-[11px] text-brand-text/40 truncate">{user.email}</p>
                <p className="text-[10px] text-brand-text/30 mt-0.5">
                  Last synced: {formatLastSynced(lastSyncedAt)}
                </p>
                {syncError && <p className="text-[10px] text-red-500 mt-0.5">Last sync failed: {syncError}</p>}
                <p className="text-[10px] text-brand-text/30">
                  Photos (profile, journal, visits, ultrasounds) stay on this device and are not backed up.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRestore}
                  disabled={syncing}
                  title="Pull changes from cloud"
                  className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"
                >
                  {syncing
                    ? <RefreshCw size={11} className="text-blue-400 animate-spin" />
                    : <CloudDownload size={11} className="text-blue-500" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleBackup}
                  disabled={syncing}
                  title="Back up now"
                  className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"
                >
                  {syncing
                    ? <RefreshCw size={11} className="text-blue-400 animate-spin" />
                    : <CloudUpload size={11} className="text-blue-500" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleGoogleSignOut}
                  title="Sign out"
                  className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"
                >
                  <LogOut size={11} className="text-red-400" />
                </motion.button>
              </div>
            </div>
          ) : (
            /* Not signed in — subtle warning chip */
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50/80 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CloudOff size={14} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-amber-700">Saved on this device only</p>
                <p className="text-[11px] text-amber-600/70">Tap to sign in with Google &amp; keep data safe ☁️</p>
              </div>
              {isSigningIn
                ? <RefreshCw size={14} className="text-amber-500 animate-spin flex-shrink-0" />
                : <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
              }
            </motion.button>
          )
        )}

        {/* Security / App Lock */}
        {!editing && (
          <Card>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Shield size={15} className="text-indigo-500" />
              </div>
              <p className="font-bold text-brand-text text-sm">App Security</p>
            </div>
            <div className="space-y-3">
              {/* App lock toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <Lock size={15} className="text-brand-text/50" />
                  <div>
                    <p className="text-sm font-semibold text-brand-text">App Lock</p>
                    <p className="text-[11px] text-brand-text/40">Require PIN to open the app</p>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleLock(!lockEnabled)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${lockEnabled ? 'bg-brand-primary' : 'bg-brand-secondary/60'}`}
                >
                  <motion.div
                    animate={{ x: lockEnabled ? 24 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </motion.button>
              </div>

              {/* Fingerprint toggle — only visible when lock is on */}
              <AnimatePresence>
                {lockEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between py-1 pl-1 border-t border-brand-secondary/30 pt-3">
                      <div className="flex items-center gap-2.5">
                        <Fingerprint size={15} className="text-brand-text/50" />
                        <div>
                          <p className="text-sm font-semibold text-brand-text">Use Fingerprint</p>
                          <p className="text-[11px] text-brand-text/40">Unlock with biometrics</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => toggleBiometric(!biometricEnabled)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${biometricEnabled ? 'bg-brand-primary' : 'bg-brand-secondary/60'}`}
                      >
                        <motion.div
                          animate={{ x: biometricEnabled ? 24 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </motion.button>
                    </div>
                    <button
                      onClick={() => { setShowSetPin(true); setPinStep('enter'); setPinInput(''); setPinConfirm('') }}
                      className="mt-3 w-full py-2.5 rounded-xl bg-brand-secondary/40 text-sm font-semibold text-brand-text flex items-center justify-center gap-2"
                    >
                      <KeyRound size={14} className="text-brand-primary" /> Change PIN
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        )}

        {/* Reset */}
        {!editing && (
          <Card className="border border-red-100">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle size={15} className="text-red-400" />
              </div>
              <div>
                <p className="font-bold text-red-500 text-sm">Reset App</p>
                <p className="text-[11px] text-brand-text/40">
                  {user ? 'Clears all data from this device and Google cloud' : 'Permanently erases all data on this device'}
                </p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!confirmReset ? (
                <motion.div key="trigger" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <button
                    onClick={() => setConfirmReset(user ? 'full' : 'local')}
                    className="w-full py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm font-bold text-red-600 mt-2"
                  >
                    {user ? 'Reset Everything' : 'Reset App'}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl bg-red-50 border border-red-200 p-3.5 space-y-3 mt-2"
                >
                  <p className="text-xs text-red-600 font-semibold leading-relaxed">
                    {user
                      ? '⚠️ This will permanently delete all data from your device and your Google cloud backup. Cannot be undone.'
                      : '⚠️ This will permanently erase all your pregnancy data from this device. Cannot be undone.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-red-200 text-sm font-semibold text-brand-text/70"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReset(confirmReset as 'local' | 'full')}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold"
                    >
                      Yes, Reset
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}
      </div>

      {/* Set PIN Modal */}
      <Modal isOpen={showSetPin} onClose={() => { setShowSetPin(false); setPinInput(''); setPinConfirm(''); setPinStep('enter') }} title={pinStep === 'enter' ? 'Set a 6-digit PIN' : 'Confirm your PIN'}>
        <div className="space-y-5">
          <p className="text-sm text-brand-text/60 text-center">
            {pinStep === 'enter' ? 'Enter a 6-digit PIN to lock your app' : 'Re-enter the PIN to confirm'}
          </p>
          {/* PIN dots */}
          <div className="flex justify-center gap-4">
            {Array.from({ length: PIN_LENGTH }, (_, i) => {
              const current = pinStep === 'enter' ? pinInput : pinConfirm
              return (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${current.length > i ? 'bg-brand-primary border-brand-primary' : 'border-brand-secondary'}`} />
              )
            })}
          </div>
          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
              <button
                key={k}
                type="button"
                disabled={k === ''}
                onClick={() => k === '⌫' ? handlePinBackspace() : k !== '' && handlePinDigit(k)}
                className={`h-14 rounded-2xl text-lg font-bold transition-all active:scale-95 ${
                  k === '' ? 'invisible' :
                  k === '⌫' ? 'bg-brand-secondary/40 text-brand-text/60' :
                  'bg-brand-secondary/40 text-brand-text active:bg-brand-primary/20'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
