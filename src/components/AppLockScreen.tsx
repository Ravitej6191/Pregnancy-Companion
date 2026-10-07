import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Fingerprint, Delete } from 'lucide-react'
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { App as CapacitorApp } from '@capacitor/app'
import {
  verifyPin, storedPinLength, getLockedUntil, recordFailure, clearFailures,
} from '../utils/appLock'

interface AppLockScreenProps {
  onUnlock: () => void
}

export function AppLockScreen({ onUnlock }: AppLockScreenProps) {
  const pinLength = storedPinLength()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shaking, setShaking] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const biometricEnabled = localStorage.getItem('appLockBiometricEnabled') === 'true'
  // Lockout is persisted (utils/appLock) so restarting the app does not reset it.
  const [lockedUntil, setLockedUntil] = useState<number | null>(getLockedUntil)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer for lockout
  useEffect(() => {
    if (lockedUntil === null) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setCountdown(0)
        clearFailures()
        setError('')
        if (countdownRef.current) clearInterval(countdownRef.current)
      } else {
        setCountdown(remaining)
      }
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [lockedUntil])

  // clearInterval on unmount
  useEffect(() => {
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [])

  // Back button on lock screen exits the app — must not bypass the lock
  useEffect(() => {
    let handle: import('@capacitor/core').PluginListenerHandle | null = null
    let cleaned = false
    CapacitorApp.addListener('backButton', () => CapacitorApp.exitApp()).then(h => {
      if (cleaned) h.remove(); else handle = h
    })
    return () => { cleaned = true; handle?.remove() }
  }, [])

  // Check biometric availability on mount
  useEffect(() => {
    async function checkBiometric() {
      try {
        const result = await BiometricAuth.checkBiometry()
        setBiometricAvailable(
          result.isAvailable &&
          result.biometryType !== BiometryType.none
        )
      } catch {
        setBiometricAvailable(false)
      }
    }
    checkBiometric()
  }, [])

  // Auto-trigger fingerprint on mount if enabled
  useEffect(() => {
    if (biometricEnabled && biometricAvailable) {
      const t = setTimeout(tryBiometric, 600)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable, biometricEnabled])

  async function tryBiometric() {
    try {
      await BiometricAuth.authenticate({
        reason: 'Unlock Katyamma Care',
        cancelTitle: 'Use PIN',
        allowDeviceCredential: false,
        iosFallbackTitle: 'Use PIN',
        androidTitle: 'Katyamma Care',
        androidSubtitle: 'Verify your identity',
        androidConfirmationRequired: false,
      })
      clearFailures()
      onUnlock()
    } catch {
      // user cancelled or failed — fall back to PIN
      setError('Use your PIN to unlock')
    }
  }

  async function handleDigit(d: string) {
    if (lockedUntil !== null) return
    if (pin.length >= pinLength) return
    setError('')
    const next = pin + d
    setPin(next)
    if (next.length === pinLength) {
      const valid = await verifyPin(next)
      if (valid) {
        clearFailures()
        onUnlock()
      } else {
        setShaking(true)
        const until = recordFailure()
        if (until) {
          setLockedUntil(until)
          setError('')
          setPin('')
          setShaking(false)
        } else {
          setError('Incorrect PIN. Try again.')
          setTimeout(() => { setShaking(false); setPin('') }, 600)
        }
      }
    }
  }

  function handleBackspace() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-gradient-to-b from-brand-primary/90 to-pink-600 flex flex-col items-center justify-center"
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
        className="mb-8 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg border border-white/30">
          <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'serif' }}>
            K<span className="text-white/70">♥</span>S
          </span>
        </div>
        <h1 className="text-white font-bold text-xl">Katyamma Care</h1>
        <p className="text-white/70 text-sm mt-1">Enter your PIN to continue</p>
      </motion.div>

      {/* PIN dots */}
      <motion.div
        animate={shaking ? { x: [-12, 12, -8, 8, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex gap-4 mb-4"
      >
        {Array.from({ length: pinLength }, (_, i) => (
          <motion.div
            key={i}
            animate={{ scale: pin.length === i + 1 ? [1, 1.3, 1] : 1 }}
            transition={{ duration: 0.15 }}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              pin.length > i
                ? 'bg-white border-white'
                : 'border-white/50 bg-white/10'
            }`}
          />
        ))}
      </motion.div>

      {/* Lockout message */}
      <AnimatePresence>
        {lockedUntil !== null && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 text-center px-6"
          >
            <p className="text-white font-bold text-sm mb-1">Too many attempts.</p>
            <p className="text-white/70 text-sm">
              Locked for {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && lockedUntil === null && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-white/80 text-sm mb-4 font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {!error && lockedUntil === null && <div className="h-7 mb-0" />}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-4 w-72">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
          <motion.button
            key={idx}
            whileTap={{ scale: 0.88 }}
            disabled={k === '' || lockedUntil !== null}
            onClick={() => k === '⌫' ? handleBackspace() : k !== '' && handleDigit(k)}
            className={`h-16 rounded-2xl text-xl font-bold transition-all ${
              k === '' ? 'invisible' :
              lockedUntil !== null ? 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed' :
              k === '⌫'
                ? 'bg-white/10 text-white/70 border border-white/20 flex items-center justify-center'
                : 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm'
            }`}
          >
            {k === '⌫' ? <Delete size={20} className="mx-auto text-white/70" /> : k}
          </motion.button>
        ))}
      </div>

      {/* Fingerprint button */}
      {biometricEnabled && biometricAvailable && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.92 }}
          onClick={tryBiometric}
          className="mt-8 flex flex-col items-center gap-2 text-white/80"
          style={{ marginBottom: 'env(safe-area-inset-bottom, 16px)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
            <Fingerprint size={30} className="text-white" />
          </div>
          <p className="text-xs text-white/60 font-medium">Use Fingerprint</p>
        </motion.button>
      )}
    </motion.div>
  )
}
