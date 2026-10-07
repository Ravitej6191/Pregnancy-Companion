import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  right?: ReactNode
}

export function PageHeader({ title, showBack = true, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-brand-bg/90 backdrop-blur-sm sticky top-0 z-20 border-b border-brand-secondary/20">
      <div className="flex items-center gap-2">
        {showBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white shadow-soft flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-brand-primary" />
          </motion.button>
        )}
        <h1 className="text-lg font-bold text-brand-text">{title}</h1>
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
