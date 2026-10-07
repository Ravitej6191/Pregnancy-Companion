import { useId, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  const uid = useId()
  const inputId = props.id ?? uid

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-brand-text/80 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`w-full rounded-xl border-2 border-brand-secondary bg-white px-4 py-3 text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:border-brand-primary transition-colors min-h-[48px] ${props.type === 'date' || props.type === 'time' ? 'pr-10' : ''} ${error ? 'border-red-400 focus:border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-500 mt-1.5 ml-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
