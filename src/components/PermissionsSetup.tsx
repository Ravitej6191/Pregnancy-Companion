import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { App as CapacitorApp } from '@capacitor/app'
import { Bell, Camera, CheckCircle2, ChevronRight } from 'lucide-react'
import { requestNotificationPermission, checkNotificationPermission } from '../notifications/notificationService'
import { Camera as CapCamera } from '@capacitor/camera'
import { KSIcon } from './SplashScreen'

interface PermissionsSetupProps {
  onDone: () => void
}

export function PermissionsSetup({ onDone }: PermissionsSetupProps) {
  // Back button — noop on this screen, user must press Continue to proceed
  useEffect(() => {
    let handle: import('@capacitor/core').PluginListenerHandle | null = null
    let cleaned = false
    CapacitorApp.addListener('backButton', () => {}).then(h => {
      if (cleaned) h.remove(); else handle = h
    })
    return () => { cleaned = true; handle?.remove() }
  }, [])

  const [notifGranted, setNotifGranted] = useState<boolean | null>(null)
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null)
  const [requestingNotif, setRequestingNotif] = useState(false)
  const [requestingCamera, setRequestingCamera] = useState(false)

  // Pre-check notification permission so the button shows correct state immediately
  useEffect(() => {
    checkNotificationPermission().then(state => {
      if (state === 'granted') setNotifGranted(true)
      if (state === 'denied') setNotifGranted(false)
      // 'prompt' → leave as null so the Allow button stays visible
    })
  }, [])

  async function handleGrantNotif() {
    setRequestingNotif(true)
    const granted = await requestNotificationPermission()
    setNotifGranted(granted)
    setRequestingNotif(false)
  }

  async function handleGrantCamera() {
    setRequestingCamera(true)
    try {
      const result = await CapCamera.requestPermissions({ permissions: ['camera', 'photos'] })
      const granted = result.camera === 'granted' || result.photos === 'granted'
      setCameraGranted(granted)
    } catch {
      setCameraGranted(false)
    }
    setRequestingCamera(false)
  }

  const PERMISSIONS = [
    {
      id: 'notifications',
      Icon: Bell,
      iconColor: '#FF8FAB',
      iconBg: '#FFF0F5',
      title: 'Notifications',
      description: 'Reminders for water intake, vitamins, kick counting, and important pregnancy milestones.',
      granted: notifGranted,
      requesting: requestingNotif,
      onGrant: handleGrantNotif,
    },
    {
      id: 'camera',
      Icon: Camera,
      iconColor: '#60A5FA',
      iconBg: '#EFF6FF',
      title: 'Camera & Photos',
      description: 'Add photos to your ultrasound album, journal entries, and doctor visit reports.',
      granted: cameraGranted,
      requesting: requestingCamera,
      onGrant: handleGrantCamera,
    },
  ]

  return (
    <div
      className="fixed inset-0 z-[9990] flex flex-col"
      style={{ background: 'linear-gradient(160deg, #FFD6E0 0%, #FFF5F7 60%, #FFE8F0 100%)' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-14 pb-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="flex justify-center mb-4"
        >
          <KSIcon size={64} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-brand-text"
        >
          Almost There!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="text-sm text-brand-text/50 mt-2 leading-relaxed"
        >
          Allow these permissions for the best pregnancy care experience.
        </motion.p>
      </div>

      {/* Permission cards */}
      <div className="flex-1 overflow-y-auto px-5 space-y-3">
        {PERMISSIONS.map((perm, i) => {
          const { Icon } = perm
          return (
            <motion.div
              key={perm.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.12 }}
              className="bg-white rounded-2xl p-4 shadow-card"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: perm.iconBg }}
                >
                  <Icon size={22} style={{ color: perm.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-brand-text text-sm">{perm.title}</p>
                  <p className="text-xs text-brand-text/55 mt-1 leading-relaxed">{perm.description}</p>

                  <div className="mt-3">
                    <AnimatePresence mode="wait">
                      {perm.granted === null ? (
                        <motion.button
                          key="grant"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={perm.onGrant}
                          disabled={perm.requesting}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold disabled:opacity-60"
                        >
                          {perm.requesting ? 'Requesting…' : `Allow ${perm.title}`}
                        </motion.button>
                      ) : perm.granted ? (
                        <motion.div
                          key="granted"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5 text-green-500 text-xs font-semibold"
                        >
                          <CheckCircle2 size={14} /> Allowed
                        </motion.div>
                      ) : (
                        <motion.div
                          key="denied"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="space-y-1"
                        >
                          <p className="text-xs text-orange-500 font-semibold">Permission denied</p>
                          <p className="text-[11px] text-brand-text/40 leading-snug">
                            Enable in Settings → Apps → Katyamma Care
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Continue button */}
      <div
        className="flex-shrink-0 px-5 py-6"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDone}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-primary text-white font-bold text-base shadow-soft"
        >
          Continue to App <ChevronRight size={18} />
        </motion.button>
        <p className="text-center text-xs text-brand-text/30 mt-3">
          You can change these any time in Android Settings
        </p>
      </div>
    </div>
  )
}
