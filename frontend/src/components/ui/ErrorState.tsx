import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ErrorStateProps {
  title?: string
  message?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function ErrorState({
  title = '出错了',
  message = '加载失败，请稍后重试',
  icon,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
    >
      {icon ? (
        <div className="text-error mb-4">{icon}</div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
      )}
      <h3 className="text-lg font-bold text-on-surface mb-2">
        {title}
      </h3>
      <p className="text-sm text-on-surface-variant max-w-md mb-6">
        {message}
      </p>
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
