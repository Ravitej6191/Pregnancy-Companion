import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Droplets, Baby, Moon, Scale, Footprints,
  BookOpen, Stethoscope, Image, ChevronRight, User, ShoppingBag, Wind
} from 'lucide-react'
import { usePregnancy } from '../hooks/usePregnancy'
import { useHealthData } from '../hooks/useHealthData'
import { useMoodTracker } from '../hooks/useMoodTracker'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { Card } from '../components/ui/Card'
import { ProgressBar } from '../components/ui/ProgressBar'
import { getDailyTip } from '../utils/pregnancyUtils'
import { MOODS } from '../utils/constants'
import { getTodayISO } from '../utils/dateUtils'
import { useAppStore } from '../store/useAppStore'
import { useObjectUrl } from '../hooks/useObjectUrl'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
}
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { profile, week, daysRemaining, progress, babySize, trimester, hasProfile, isLoading } = usePregnancy()
  const profilePhotoUrl = useObjectUrl(profile?.photo)
  const { getTodayValue } = useHealthData()
  const { todayMood } = useMoodTracker()

  const todayKicks = useLiveQuery(
    () => db.kickSessions.where('date').equals(getTodayISO()).toArray().then(s => s.reduce((t, k) => t + k.kickCount, 0)),
    []
  ) ?? 0

  const remindersCount = useLiveQuery(
    () => db.reminders.filter(r => r.isActive).count(),
    []
  ) ?? 0

  const waterGlasses = Math.round(getTodayValue('water') / 250)
  const sleep = getTodayValue('sleep')
  const weight = getTodayValue('weight')
  const steps = getTodayValue('steps')

  // Show nothing while IndexedDB is loading (avoids "Begin My Journey" flash)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-hero-gradient flex items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-brand-primary"
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-hero-gradient flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-6">🤱</div>
        <h1 className="text-2xl font-bold text-brand-text mb-2">Katyamma Care</h1>
        <p className="text-brand-text/60 mb-8 text-sm">Private, offline, and made with love.</p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => useAppStore.getState().setIsOnboarding(true)}
          className="bg-brand-primary text-white px-8 py-4 rounded-xl font-semibold text-base shadow-soft"
        >
          Begin My Journey
        </motion.button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-hero-gradient">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate('/profile')}
              className="w-11 h-11 rounded-full bg-brand-primary/15 border-2 border-brand-primary/30 flex items-center justify-center flex-shrink-0 overflow-hidden"
            >
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-brand-primary" />
              )}
            </motion.button>
            <div>
              <p className="text-brand-text/60 text-sm font-medium">Hello, {profile?.firstName}</p>
              <h1 className="text-2xl font-bold text-brand-text">Week {week}</h1>
              <p className="text-brand-primary font-semibold text-sm">{trimester}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/reminders')}
            className="w-11 h-11 rounded-xl bg-white shadow-soft flex items-center justify-center relative"
          >
            <Bell size={20} className="text-brand-primary" />
            {remindersCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-brand-primary rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                {remindersCount > 9 ? '9+' : remindersCount}
              </span>
            )}
          </motion.button>
        </div>

        {/* Progress Card */}
        <Card gradient>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-brand-text">{daysRemaining}</p>
              <p className="text-xs text-brand-text/60 font-medium">days remaining</p>
            </div>
            <div className="text-right">
              <div className="text-4xl">{babySize?.emoji}</div>
              <p className="text-xs text-brand-text/60 font-medium mt-0.5">Size of a {babySize?.name}</p>
            </div>
          </div>
          <ProgressBar progress={progress} label={`${week}/40 weeks`} />
          <p className="text-xs text-brand-text/60 mt-2 font-medium">Your baby is growing stronger every day</p>
        </Card>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-5 space-y-3 pb-6"
      >
        {/* Unified 2-col grid — tracker + feature cards flow without gaps */}
        <p className="text-xs font-bold uppercase tracking-widest text-brand-text/40">Today</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Water',        icon: Droplets,    iconBg: 'bg-blue-50',   iconColor: 'text-blue-500',     value: `${waterGlasses}`,                    sub: waterGlasses > 0 ? 'glasses today' : 'Not logged', path: '/track/water',             isMetric: true },
            { label: 'Kicks',        icon: Baby,        iconBg: 'bg-pink-50',   iconColor: 'text-brand-primary', value: `${todayKicks}`,                      sub: 'today',                                           path: '/track/kicks',             isMetric: true },
            { label: 'Sleep',        icon: Moon,        iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500',   value: sleep > 0 ? `${sleep}` : '—',             sub: sleep > 0 ? 'hours' : 'Not logged',  path: '/track/health?type=sleep',  isMetric: true  },
            { label: 'Weight',       icon: Scale,       iconBg: 'bg-green-50',  iconColor: 'text-green-500',    value: weight > 0 ? `${weight}` : '—',           sub: weight > 0 ? 'kg' : 'Not logged',    path: '/track/health?type=weight', isMetric: true  },
            { label: 'Steps',        icon: Footprints,  iconBg: 'bg-orange-50', iconColor: 'text-orange-500',   value: steps > 0 ? steps.toLocaleString() : '—', sub: steps > 0 ? 'steps' : 'Not logged',  path: '/track/health?type=steps',  isMetric: true  },
            { label: 'My Journal',   icon: BookOpen,    iconBg: 'bg-teal-50',   iconColor: 'text-teal-500',     value: '',                                       sub: 'Write entries',                     path: '/journal',                  isMetric: false },
            { label: 'Doctor Visits',icon: Stethoscope, iconBg: 'bg-cyan-50',   iconColor: 'text-cyan-600',     value: '',                                       sub: 'Log appointments',                  path: '/doctor-visits',            isMetric: false },
            { label: 'Ultrasound',   icon: Image,       iconBg: 'bg-violet-50', iconColor: 'text-violet-500',   value: '',                                       sub: 'Photo album',                       path: '/ultrasound',               isMetric: false },
            { label: 'Hospital Bag', icon: ShoppingBag, iconBg: 'bg-rose-50',   iconColor: 'text-rose-500',     value: '',                                       sub: 'Packing checklist',                 path: '/checklist',                isMetric: false },
            { label: 'Breathing',    icon: Wind,        iconBg: 'bg-sky-50',    iconColor: 'text-sky-500',      value: '',                                       sub: 'Calm & relax',                      path: '/breathing',                isMetric: false },
          ].map(item => (
            <motion.div key={item.label} variants={itemVariants} className="h-full">
              <Card className="cursor-pointer h-full flex flex-col justify-between min-h-[100px]" whileTap={{ scale: 0.97 }} onClick={() => navigate(item.path)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                    <item.icon size={14} className={item.iconColor} />
                  </div>
                  <span className="text-xs font-semibold text-brand-text/50">{item.label}</span>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  {item.isMetric
                    ? <p className="text-xl font-bold text-brand-text leading-none mb-0.5">{item.value}</p>
                    : <p className="text-base font-bold text-brand-text leading-tight mb-0.5">{item.label}</p>
                  }
                  <p className="text-xs text-brand-text/40">{item.sub}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Daily Tip — pink */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-primary to-pink-400 shadow-soft">
            <div className="p-4">
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1.5">Tip of the Day</p>
              <p className="text-white font-semibold text-sm leading-relaxed">{getDailyTip()}</p>
            </div>
          </div>
        </motion.div>

        {/* Baby Development */}
        <motion.div variants={itemVariants}>
          <Card gradient className="cursor-pointer" whileTap={{ scale: 0.98 }} onClick={() => navigate('/guide')}>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{babySize?.emoji}</div>
              <div className="flex-1">
                <p className="font-bold text-brand-text text-sm">Week {week} Highlights</p>
                <p className="text-xs text-brand-text/60 mt-0.5">Read this week's guide</p>
              </div>
              <ChevronRight size={18} className="text-brand-text/30" />
            </div>
          </Card>
        </motion.div>

        <div className="h-4" />
      </motion.div>
    </div>
  )
}
