import type { ReactNode } from 'react'

interface LoadingStateProps {
  message?: string
  icon?: ReactNode
  className?: string
}

export function LoadingState({ message = '加载中...', icon, className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className || ''}`}>
      {icon || (
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      )}
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  )
}
