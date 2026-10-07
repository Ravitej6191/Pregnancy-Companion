import { useEffect, useRef, useState } from 'react'
import { db } from './db/database'
import { seedDatabase } from './db/seed'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import { AppRouter } from './router/AppRouter'
import { SplashScreen } from './components/SplashScreen'
import { PermissionsSetup } from './components/PermissionsSetup'
import { AppLockScreen } from './components/AppLockScreen'
import { GoogleSignInScreen } from './components/GoogleSignInScreen'
import { ToastContainer } from './components/ui/Toast'
import { AnimatePresence } from 'framer-motion'
import { restoreGoogleSession } from './services/googleAuth'
import { isFirebaseConfigured } from './config/firebase'
import { cleanupStaleReminders } from './hooks/useReminders'
import { App as CapacitorApp } from '@capacitor/app'
import { hasPin } from './utils/appLock'
import { pushToCloud, pullFromCloud } from './services/syncService'

const PERMISSIONS_KEY = 'permissionsSetupDone'
function isLockRequired(): boolean {
  return localStorage.getItem('appLockEnabled') === 'true' && hasPin()
}

// Re-lock when the app comes back after being in the background this long.
const RELOCK_AFTER_MS = 30_000
const MIN_SPLASH_MS = 1200 // brand moment only; boot work runs in parallel

export default function App() {
  const { profile, setProfile, setIsOnboarding } = useAppStore()
  const { user } = useAuthStore()
  const [showSplash, setShowSplash] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showLock, setShowLock] = useState(false)
  const [initDone, setInitDone] = useState(false)

  // ── Initial boot sequence ─────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        let [profiles] = await Promise.all([
          // seedDatabase → cleanupStaleReminders must run sequentially (no concurrent Dexie upgrades)
          seedDatabase()
            .then(() => cleanupStaleReminders())
            .then(() => db.pregnancyProfile.toArray()),
          new Promise(resolve => setTimeout(resolve, MIN_SPLASH_MS)),
          restoreGoogleSession().catch(err => console.warn('[auth] restore failed', err)),
        ])

        // Signed in but no local data (reinstall): restore from the cloud before
        // deciding to onboard, so the user never re-enters data that already exists.
        if (profiles.length === 0 && useAuthStore.getState().user) {
          try {
            await pullFromCloud()
            profiles = await db.pregnancyProfile.toArray()
          } catch (err) {
            console.warn('[sync] restore on launch failed', err)
          }
        }

        if (profiles.length === 0) {
          setIsOnboarding(true)
          // No profile = fresh install (or app data cleared).
          // Reset the dismissed flag so the login screen always appears on first use,
          // even if stale localStorage from a prior install/test session is present.
          localStorage.removeItem('loginScreenDismissed')
        } else {
          setProfile(profiles[0])
          setIsOnboarding(false)
        }
      } catch (err) {
        console.error('[boot] init failed', err)
        setIsOnboarding(true)
        localStorage.removeItem('loginScreenDismissed')
      }

      setInitDone(true)
      setShowSplash(false)

      // Show Google login if Firebase is configured, user is not signed in,
      // and hasn't explicitly dismissed the screen before.
      // Lock first: a signed-in user skips the login screen, so the lock must be
      // decided here at boot (previously it was only reachable via the login flow).
      if (isLockRequired()) setShowLock(true)

      const currentUser = useAuthStore.getState().user
      const loginDismissed = localStorage.getItem('loginScreenDismissed') === 'true'
      if (isFirebaseConfigured && !currentUser && !loginDismissed) {
        setShowLogin(true)
      }
    }
    init()
  }, [])

  // ── Re-lock after the app has been backgrounded ───────────────────────────
  useEffect(() => {
    let backgroundedAt: number | null = null
    let handle: { remove: () => Promise<void> } | null = null
    let cleaned = false
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) { backgroundedAt = Date.now(); return }
      if (backgroundedAt !== null && Date.now() - backgroundedAt > RELOCK_AFTER_MS && isLockRequired()) {
        setShowLock(true)
      }
      backgroundedAt = null
    }).then(h => { if (cleaned) h.remove(); else handle = h })
    return () => { cleaned = true; handle?.remove() }
  }, [])

  // ── Auto-push to cloud after onboarding when signed in ───────────────────
  // Fires when profile goes from null → set AND user is signed in.
  // This covers new users who signed in before onboarding completes.
  const didAutoSync = useRef(false)
  useEffect(() => {
    if (!initDone || !profile || !user || didAutoSync.current) return
    didAutoSync.current = true
    pushToCloud().catch(err => console.warn('[sync] auto-sync failed', err))
  }, [profile, user, initDone])

  // ── Show permissions screen once after the profile is first created ───────
  // This fires when onboarding completes (profile goes from null → set)
  // and the permissions screen hasn't been shown yet.
  useEffect(() => {
    if (!initDone) return
    if (!profile) return
    if (showSplash || showLogin || showLock) return
    const permsDone = localStorage.getItem(PERMISSIONS_KEY) === 'true'
    if (!permsDone) {
      setShowPermissions(true)
    }
  }, [profile, initDone, showSplash, showLogin, showLock])

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleLoginDone() {
    setShowLogin(false)
    // Permissions are handled by the useEffect above once a profile exists.
    // If the user already has a profile (returning user), check permissions now.
    const hasProfile = !!useAppStore.getState().profile
    if (hasProfile) {
      const permsDone = localStorage.getItem(PERMISSIONS_KEY) === 'true'
      if (!permsDone) {
        setShowPermissions(true)
        return
      }
    }
    // Check app lock
    if (isLockRequired()) setShowLock(true)
  }

  function handlePermissionsDone() {
    localStorage.setItem(PERMISSIONS_KEY, 'true')
    setShowPermissions(false)

    if (isLockRequired()) setShowLock(true)
  }

  function handleUnlock() {
    setShowLock(false)
  }

  const showApp = !showSplash && !showLogin && !showLock && !showPermissions

  return (
    <>
      <SplashScreen visible={showSplash} />

      <AnimatePresence>
        {!showSplash && showLogin && (
          <GoogleSignInScreen key="google-signin" onDone={handleLoginDone} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!showSplash && !showLogin && showLock && (
          <AppLockScreen key="app-lock" onUnlock={handleUnlock} />
        )}
      </AnimatePresence>

      {!showSplash && !showLogin && !showLock && showPermissions && (
        <PermissionsSetup onDone={handlePermissionsDone} />
      )}

      {showApp && <AppRouter />}

      <ToastContainer />
    </>
  )
}
