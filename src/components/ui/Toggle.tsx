import { motion } from 'framer-motion'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  size?: 'sm' | 'md'
}

export function Toggle({ checked, onChange, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 'w-10' : 'w-12'
  const h = size === 'sm' ? 'h-6' : 'h-7'
  const thumb = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const translateX = size === 'sm' ? 16 : 20

  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      className={`${w} ${h} rounded-full relative transition-colors duration-300 flex-shrink-0 ${checked ? 'bg-brand-primary' : 'bg-gray-200'}`}
    >
      <motion.div
        className={`${thumb} bg-white rounded-full absolute top-1 left-1 shadow-sm`}
        animate={{ x: checked ? translateX : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  )
}
