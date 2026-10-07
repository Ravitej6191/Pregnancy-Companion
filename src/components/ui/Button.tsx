import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  fullWidth?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
}

const variants = {
  primary: 'bg-brand-primary text-white shadow-soft',
  secondary: 'bg-brand-secondary text-brand-text',
  ghost: 'bg-transparent text-brand-primary border-2 border-brand-primary',
  danger: 'bg-red-100 text-red-600',
}

const sizes = {
  sm: 'text-sm px-4 py-2 min-h-[36px]',
  md: 'text-sm px-5 py-3 min-h-[48px]',
  lg: 'text-base px-6 py-4 min-h-[56px]',
}

export function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, fullWidth = false, className = '',
  type = 'button', 'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      className={`${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} rounded-xl font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </motion.button>
  )
}
