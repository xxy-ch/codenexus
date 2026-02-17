import { CircularProgress } from '@mui/material'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: number
  className?: string
}

export function Loading({ size = 40, className }: LoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <CircularProgress size={size} className="text-primary" />
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