import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { App as CapacitorApp } from '@capacitor/app'
import { signInWithGoogle } from '../services/googleAuth'
import { pullFromCloud, pushToCloud } from '../services/syncService'
import { useAppStore } from '../store/useAppStore'
import { useToast } from './ui/Toast'
import { KSIcon } from './SplashScreen'

interface Props {
  onDone: () => void
}

export function GoogleSignInScreen({ onDone }: Props) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { show } = useToast()

  // Mark as shown the moment this screen mounts.
  // This makes it a true one-time screen — regardless of what the user does
  // (sign in, skip, fail, close app mid-flow), it will never appear again.
  useEffect(() => {
    localStorage.setItem('loginScreenDismissed', 'true')
  }, [])

  // Back button — treat as "skip"
  useEffect(() => {
    let handle: import('@capacitor/core').PluginListenerHandle | null = null
    let cleaned = false
    CapacitorApp.addListener('backButton', handleSkip).then(h => {
      if (cleaned) h.remove(); else handle = h
    })
    return () => { cleaned = true; handle?.remove() }
  }, [])

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await signInWithGoogle()

      // Restore cloud backup if it exists — covers the "reinstall + login" case.
      // Only push if no cloud data AND profile already exists (i.e. returning user
      // who signed in after previously using the app). New users who sign in before
      // onboarding will have their data pushed automatically after onboarding.
      // Merge-only pull (restores a reinstall's data without overwriting anything),
      // then push any local data. Best-effort — never block sign-in; failures are
      // recorded in the auth store and retried on the next launch.
      try {
        await pullFromCloud()
        if (useAppStore.getState().profile) await pushToCloud()
      } catch (err) {
        console.warn('[sync] post-sign-in sync failed', err)
      }

      setSuccess(true)
      show('Signed in!', 'success')
      setTimeout(() => onDone(), 900)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
        show('Sign-in failed. Try again.', 'error')
      }
      setLoading(false)
    }
  }

  function handleSkip() {
    localStorage.setItem('loginScreenDismissed', 'true')
    onDone()
  }

  const features = [
    { emoji: '🤰', label: 'Weekly pregnancy guide' },
    { emoji: '💓', label: 'Kick counter & health tracking' },
    { emoji: '📋', label: 'Doctor visits & reminders' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #FFD6E0 0%, #FFF5F7 55%, #FFE8F0 100%)' }}
    >
      {/* Floating circles */}
      <motion.div className="absolute top-16 left-8 w-24 h-24 rounded-full bg-brand-primary/10 pointer-events-none"
        animate={{ y: [-8, 8, -8], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute top-32 right-6 w-16 h-16 rounded-full bg-brand-accent/20 pointer-events-none"
        animate={{ y: [8, -8, 8] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-56 left-10 w-20 h-20 rounded-full bg-pink-200/30 pointer-events-none"
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute bottom-40 right-8 w-10 h-10 rounded-full bg-brand-primary/15 pointer-events-none"
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />

      {/* Hero — centered vertically in remaining space above card */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 relative z-10"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          >
            <KSIcon size={96} />
          </motion.div>
        </motion.div>

        <motion.h1
          className="text-2xl font-bold text-brand-text mt-5 leading-tight text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          Katyamma Care
        </motion.h1>
        <motion.p
          className="text-xs text-brand-text/45 font-medium mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          Built by your Hubby 💕
        </motion.p>

        {/* Feature pills */}
        <motion.div
          className="mt-8 flex flex-col gap-2.5 w-full max-w-xs"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/60"
            >
              <span className="text-lg leading-none">{f.emoji}</span>
              <span className="text-sm font-medium text-brand-text/70">{f.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Sign-in card — anchored to bottom */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 210, damping: 28 }}
        className="relative z-10 mx-5 mb-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div
          className="rounded-3xl p-6 shadow-lg border border-white/70"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}
        >
          <h2 className="text-base font-bold text-brand-text mb-1">Welcome, Mama 👋</h2>
          <p className="text-xs text-brand-text/50 mb-5 leading-relaxed">
            Sign in to back up your data and restore it on any device.
          </p>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-50 border border-green-200"
              >
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg viewBox="0 0 12 12" className="w-3 h-3">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-green-700">Signed in!</span>
              </motion.div>
            ) : (
              <motion.button
                key="google-btn"
                onClick={handleGoogleSignIn}
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl bg-white border border-gray-200 shadow-sm active:shadow-none transition-shadow disabled:opacity-70"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-gray-300 border-t-brand-primary rounded-full"
                  />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span className="text-sm font-semibold text-gray-700">
                  {loading ? 'Signing in…' : 'Continue with Google'}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={handleSkip}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full text-center text-xs text-brand-text/35 py-4 active:text-brand-text/60 transition-colors"
        >
          Continue without account
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
