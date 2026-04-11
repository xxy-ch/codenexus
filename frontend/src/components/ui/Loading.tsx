import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: number
  className?: string
  message?: string
}

export function Loading({ size = 40, className, message }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <span
        data-testid="loading-spinner"
        className="inline-block animate-spin rounded-full border-4 border-border border-t-primary"
        style={{ width: size, height: size }}
      />
      {message && <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>}
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loading size={60} />
        <p className="mt-4 text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  )
}
