import { useNavigate, useLocation } from 'react-router-dom'
import { Home, CheckSquare, BookMarked, User } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/daily-checklist', icon: CheckSquare, label: 'My Routine' },
  { path: '/guide', icon: BookMarked, label: 'Guide' },
  { path: '/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/profile') {
      return location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/reminders') ||
        location.pathname.startsWith('/settings')
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-secondary/30 z-30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1 pt-1.5 pb-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = isActive(path)
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              whileTap={{ scale: 0.88 }}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl min-w-[64px] min-h-[48px] justify-center relative"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-brand-primary/10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div animate={{ y: active ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400 }}>
                <Icon
                  size={22}
                  className={active ? 'text-brand-primary' : 'text-gray-400'}
                  strokeWidth={active ? 2.5 : 1.5}
                />
              </motion.div>
              <span className={`text-[10px] font-semibold ${active ? 'text-brand-primary' : 'text-gray-400'}`}>
                {label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
