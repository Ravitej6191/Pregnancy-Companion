import { motion } from 'framer-motion'

interface ProgressBarProps {
  progress: number
  label?: string
  color?: string
  height?: string
  showLabel?: boolean
}

export function ProgressBar({ progress, label, color = '#FF8FAB', height = 'h-3', showLabel = true }: ProgressBarProps) {
  return (
    <div className="w-full">
      {(label || showLabel) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-xs font-medium text-brand-text/70">{label}</span>}
          {showLabel && <span className="text-xs font-semibold text-brand-primary">{Math.round(progress)}%</span>}
        </div>
      )}
      <div className={`w-full bg-brand-secondary rounded-full overflow-hidden ${height}`}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, progress)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
