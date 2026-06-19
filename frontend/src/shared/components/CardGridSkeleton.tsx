import { Skeleton } from '@/shared/components/Skeleton'
import { cn } from '@/shared/lib/utils'

interface CardGridSkeletonProps {
  /** Number of cards to render (default: 6) */
  cards?: number
  className?: string
}

export function CardGridSkeleton({ cards = 6, className }: CardGridSkeletonProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6', className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={`card-${i}`}
          className="rounded-[8px] border border-border bg-card p-6"
        >
          <Skeleton className="mb-3 h-6 w-3/4" />
          <Skeleton className="mb-4 h-4 w-1/2" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
