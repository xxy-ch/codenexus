import { Skeleton } from '@/shared/components/Skeleton'
import { cn } from '@/shared/lib/utils'

interface FormSkeletonProps {
  /** Number of label+input rows to render (default: 5) */
  rows?: number
  className?: string
}

export function FormSkeleton({ rows = 5, className }: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`form-row-${i}`} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-[8px]" />
        </div>
      ))}
    </div>
  )
}
