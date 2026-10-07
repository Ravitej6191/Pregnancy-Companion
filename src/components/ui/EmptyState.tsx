interface EmptyStateProps {
  emoji?: string
  icon?: React.ReactNode
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function EmptyState({ emoji, icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {icon ? (
        <div className="w-16 h-16 rounded-2xl bg-brand-secondary/40 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
      ) : (
        <div className="text-5xl mb-4">{emoji ?? '🌸'}</div>
      )}
      <p className="font-semibold text-brand-text/80 text-base mb-1">{title}</p>
      {subtitle && <p className="text-sm text-brand-text/50 mb-4">{subtitle}</p>}
      {action}
    </div>
  )
}
