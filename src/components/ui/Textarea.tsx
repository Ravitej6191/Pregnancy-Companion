import { useId, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  const uid = useId()
  const textareaId = props.id ?? uid

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-semibold text-brand-text/80 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={!!error}
        aria-describedby={error ? `${textareaId}-error` : undefined}
        className={`w-full rounded-xl border-2 border-brand-secondary bg-white px-4 py-3 text-sm text-brand-text placeholder-brand-text/40 focus:outline-none focus:border-brand-primary transition-colors resize-none min-h-[48px] ${error ? 'border-red-400 focus:border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-red-500 mt-1.5 ml-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
