import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface TableSkeletonProps {
  /** Number of content rows to render (default: 5) */
  rows?: number
  /** Number of columns to render (default: 4) */
  columns?: number
  className?: string
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header row */}
      <div className="flex gap-4 border-b pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 w-24 flex-1" />
        ))}
      </div>
      {/* Content rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 w-full flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
