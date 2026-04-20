import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface ProfileSkeletonProps {
  className?: string
}

export function ProfileSkeleton({ className }: ProfileSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Profile header card */}
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="px-6 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <Skeleton className="h-24 w-24 rounded-[28px]" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-28" />
                <div className="flex flex-wrap gap-3">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-32 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Activity + identity panels */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Recent activity */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-2 h-5 w-20" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`activity-${i}`} className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Identity panel */}
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <Skeleton className="h-3 w-16" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`identity-${i}`} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-1 h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
