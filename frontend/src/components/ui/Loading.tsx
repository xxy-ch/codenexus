import { CircularProgress } from '@mui/material'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: number
  className?: string
  message?: string
}

export function Loading({ size = 40, className, message }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <CircularProgress size={size} className="text-primary" />
      {message && <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>}
    </div>
  )
}

interface PageLoadingProps {
  message?: string
}

export function PageLoading({ message = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loading size={60} />
        <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}