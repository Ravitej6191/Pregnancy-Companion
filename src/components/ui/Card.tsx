import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'

interface CardProps extends HTMLMotionProps<'div'> {
  gradient?: boolean
  noPad?: boolean
}

export function Card({ children, className = '', gradient = false, noPad = false, ...props }: CardProps) {
  return (
    <motion.div
      className={`rounded-2xl shadow-card ${gradient ? 'bg-card-gradient' : 'bg-white'} ${noPad ? '' : 'p-4'} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
