import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface ProblemDetailSkeletonProps {
  className?: string
}

export function ProblemDetailSkeleton({ className }: ProblemDetailSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`tag-${i}`} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      {/* Description card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-3 px-6 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Examples card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Constraints card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-2 px-6 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`constraint-${i}`} className="h-4 w-2/3" />
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
    </div>
  )
}
