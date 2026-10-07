import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { App as CapacitorApp } from '@capacitor/app'
import { db } from '../db/database'
import { useAppStore } from '../store/useAppStore'
import { BLOOD_TYPES } from '../utils/constants'
import { KSIcon } from '../components/SplashScreen'
import { useToast } from '../components/ui/Toast'

export function OnboardingPage() {
  const [firstName, setFirstName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueDateError, setDueDateError] = useState('')
  const [doctorName, setDoctorName] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [bloodType, setBloodType] = useState('O+')
  const [saving, setSaving] = useState(false)
  const { setIsOnboarding, setProfile } = useAppStore()
  const { show } = useToast()
  const lastBackPressRef = useRef<number>(0)

  // Back button on onboarding — double-tap to exit (no previous screen to go back to)
  useEffect(() => {
    let handle: import('@capacitor/core').PluginListenerHandle | null = null
    let cleaned = false
    CapacitorApp.addListener('backButton', () => {
      const now = Date.now()
      if (now - lastBackPressRef.current < 2000) {
        CapacitorApp.exitApp()
      } else {
        lastBackPressRef.current = now
        show('Press back again to exit', 'info')
      }
    }).then(h => {
      if (cleaned) h.remove(); else handle = h
    })
    return () => { cleaned = true; handle?.remove() }
  }, [show])

  function validateDueDate(value: string): string {
    if (!value) return ''
    const due = new Date(value)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxFuture = new Date(today)
    maxFuture.setDate(today.getDate() + 294)
    const minFuture = new Date(today)
    minFuture.setDate(today.getDate() + 1)
    if (due < minFuture) return 'Due date must be in the future'
    if (due > maxFuture) return 'Due date seems too far (max 42 weeks)'
    return ''
  }

  const canSave = firstName.trim().length > 0 && dueDate.length > 0 && !dueDateError

  async function handleStart() {
    if (!canSave) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const id = await db.pregnancyProfile.add({
        firstName: firstName.trim(),
        dueDate,
        lmpDate: '',
        doctorName,
        hospitalName,
        bloodType,
        createdAt: now,
      })
      const profile = await db.pregnancyProfile.get(id as number)
      if (profile) setProfile(profile)
      setIsOnboarding(false)
    } catch {
      show('Could not save profile. Please try again.', 'error')
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(160deg, #FFD6E0 0%, #FFF5F7 55%, #FFE8F0 100%)',
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, paddingBottom: 10 }}>
        <KSIcon size={54} />
        <h1 style={{ margin: '8px 0 2px', fontSize: 20, fontWeight: 800, color: '#3D1A24', letterSpacing: '-0.3px' }}>
          Welcome, Mama! 💕
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(61,26,36,0.50)', margin: 0 }}>
          Set up your Katyamma Care journey
        </p>
      </div>

      {/* ── Form card — fills remaining space ── */}
      <div
        style={{
          flex: 1,
          margin: '0 16px 20px',
          background: '#FFFFFF',
          borderRadius: 24,
          boxShadow: '0 4px 24px rgba(255,111,143,0.12)',
          border: '1px solid rgba(255,255,255,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Fields — justified to fill card height */}
        <div style={{
          flex: 1,
          padding: '20px 20px 0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}>

          <Field label="Your Name *">
            <input
              type="text"
              placeholder="e.g. Priya"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Due Date *" error={dueDateError}>
            <input
              type="date"
              value={dueDate}
              onChange={e => {
                setDueDate(e.target.value)
                setDueDateError(validateDueDate(e.target.value))
              }}
              style={inputStyle}
            />
          </Field>

          <Field label="Doctor's Name">
            <input
              type="text"
              placeholder="e.g. Dr. Sharma"
              value={doctorName}
              onChange={e => setDoctorName(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Hospital">
            <input
              type="text"
              placeholder="e.g. Apollo Hospital"
              value={hospitalName}
              onChange={e => setHospitalName(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Blood Type">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 2 }}>
              {BLOOD_TYPES.map(bt => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBloodType(bt)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: bloodType === bt ? '#FF8FAB' : 'rgba(255,143,171,0.12)',
                    color: bloodType === bt ? '#FFFFFF' : '#3D1A24',
                  }}
                >
                  {bt}
                </button>
              ))}
            </div>
          </Field>

        </div>

        {/* ── CTA button inside card at bottom ── */}
        <div style={{ padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '15px 0',
              borderRadius: 18,
              border: 'none',
              cursor: canSave && !saving ? 'pointer' : 'default',
              fontSize: 15,
              fontWeight: 700,
              color: '#FFFFFF',
              background: canSave && !saving
                ? 'linear-gradient(135deg, #FF8FAB 0%, #F76E8C 100%)'
                : 'rgba(255,143,171,0.40)',
              boxShadow: canSave && !saving ? '0 4px 16px rgba(255,111,143,0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Setting up…' : '🌸 Start My Journey'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(61,26,36,0.30)', margin: '6px 0 0' }}>
            You can update all details anytime in Profile
          </p>
        </div>
      </div>

    </motion.div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1.5px solid rgba(255,143,171,0.25)',
  fontSize: 14,
  color: '#3D1A24',
  background: 'rgba(255,143,171,0.04)',
  outline: 'none',
  boxSizing: 'border-box',
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(61,26,36,0.55)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </label>
      {children}
      {error && <span style={{ fontSize: 10, color: '#F76E8C', marginTop: 1 }}>{error}</span>}
    </div>
  )
}
