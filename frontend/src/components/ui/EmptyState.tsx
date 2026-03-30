import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon && (
        <div className="text-surface-variant mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-on-surface mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-md mb-6">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:brightness-110 active:scale-95 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
