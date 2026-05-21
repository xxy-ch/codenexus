import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface ProblemListSkeletonProps {
  className?: string
}

export function ProblemListSkeleton({ className }: ProblemListSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className="rounded-lg border p-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-1 h-7 w-14" />
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="rounded-lg border p-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Results header */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Problem rows */}
        <div className="divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`row-${i}`} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 flex-1 max-w-xs" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-lg border px-5 py-3">
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
    </div>
  )
}
