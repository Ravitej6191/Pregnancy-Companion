import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  visible: boolean
}

/**
 * Shared KS heart icon — used on splash, auth, onboarding, and anywhere
 * an icon is needed. Matches the app launcher design exactly:
 * pink rounded square → semi-transparent white heart → bold white "KS".
 */
export function KSIcon({ size = 112 }: { size?: number }) {
  const r = Math.round(size * 0.22) // border radius ~22% gives the squircle look
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: 'linear-gradient(145deg, #FF8FAB 0%, #F76E8C 100%)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 4px 24px rgba(255,111,143,0.40)',
      }}
    >
      {/* Heart watermark — white, ~28% opacity */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <path
          fill="rgba(255,255,255,0.30)"
          d="M50,82 C27,64 8,51 8,33 C8,19 19,10 31,10 C38,10 44,15 50,23 C56,15 62,10 69,10 C81,10 92,19 92,33 C92,51 73,64 50,82 Z"
        />
      </svg>

      {/* Bold KS letters */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: Math.round(size * 0.40),
          fontFamily: "'Poppins', system-ui, sans-serif",
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        KS
      </span>
    </div>
  )
}

export function SplashScreen({ visible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #FFD6E0 0%, #FFF5F7 55%, #FFE8F0 100%)' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >

          {/* Floating circles (decorative) */}
          <motion.div
            className="absolute top-16 left-8 w-24 h-24 rounded-full bg-brand-primary/10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [-8, 8, -8] }}
            transition={{ opacity: { delay: 0.3 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
          />
          <motion.div
            className="absolute top-32 right-6 w-16 h-16 rounded-full bg-brand-accent/20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [8, -8, 8] }}
            transition={{ opacity: { delay: 0.3 }, y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }}
          />
          <motion.div
            className="absolute bottom-40 left-10 w-20 h-20 rounded-full bg-pink-200/30 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [-6, 6, -6] }}
            transition={{ opacity: { delay: 0.35 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
          />
          <motion.div
            className="absolute bottom-24 right-12 w-12 h-12 rounded-full bg-brand-primary/15 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [6, -6, 6] }}
            transition={{ opacity: { delay: 0.35 }, y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }}
          />

          {/* Main content */}
          <div className="flex flex-col items-center gap-5 px-8 text-center relative z-10">

            {/* Icon — starts at same size/position as system splash, no spring-in */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative"
            >
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              >
                <KSIcon size={108} />
              </motion.div>
              {/* Pulse rings */}
              <motion.div
                className="absolute inset-0 border-2 border-white/30 pointer-events-none"
                style={{ borderRadius: Math.round(108 * 0.22) }}
                animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
              />
            </motion.div>

            {/* App name */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="space-y-1"
            >
              <h1 className="text-3xl font-bold text-brand-text leading-tight">Katyamma Care</h1>
              <p className="text-sm text-brand-text/50 font-medium">Built by your Hubby 💕</p>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex gap-2 mt-1"
            >
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-primary"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
