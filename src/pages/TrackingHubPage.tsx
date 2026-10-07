import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageHeader } from '../components/layout/PageHeader'
import { Card } from '../components/ui/Card'

const trackItems = [
  { path: '/track/kicks', emoji: '👶', title: 'Kick Counter', subtitle: 'Track baby movements', color: 'from-pink-100 to-rose-50' },
  // { path: '/track/contractions', emoji: '⏱️', title: 'Contraction Timer', subtitle: 'Time your contractions', color: 'from-orange-100 to-amber-50' },
  { path: '/track/health', emoji: '📊', title: 'Health Tracker', subtitle: 'Sleep, weight & steps', color: 'from-green-100 to-emerald-50' },
  { path: '/track/water', emoji: '💧', title: 'Water Tracker', subtitle: 'Stay hydrated daily', color: 'from-blue-100 to-cyan-50' },
  // { path: '/track/mood', emoji: '🌈', title: 'Mood Tracker', subtitle: 'Track how you feel', color: 'from-purple-100 to-violet-50' },
]

export function TrackingHubPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-brand-bg">
      <PageHeader title="My Tracker" showBack={false} />
      <div className="px-5 pb-6 space-y-3">
        {trackItems.map((item, i) => (
          <motion.div
            key={item.path}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card
              className={`cursor-pointer bg-gradient-to-r ${item.color}`}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center text-3xl shadow-soft">
                  {item.emoji}
                </div>
                <div>
                  <p className="font-bold text-brand-text">{item.title}</p>
                  <p className="text-xs text-brand-text/60 mt-0.5">{item.subtitle}</p>
                </div>
                <div className="ml-auto text-brand-text/30 text-lg">›</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
