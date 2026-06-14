import { Skeleton } from '@/shared/components/Skeleton'
import { cn } from '@/shared/lib/utils'

interface DashboardSkeletonProps {
  className?: string
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero section: overview + streak */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <div className="flex items-center gap-6 pt-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
            </div>
            <Skeleton className="h-10 w-px" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-4 w-full" />
        </div>
      </section>

      {/* Stats cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={`stat-${i}`} className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>

      {/* Weekly focus + progress snapshot */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-2/3" />
          <div className="grid gap-4 md:grid-cols-3 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`focus-${i}`} className="space-y-2 rounded-2xl bg-muted p-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-32" />
          <div className="space-y-4 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`progress-${i}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent activity + rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`activity-${i}`} className="flex items-center gap-3 rounded-lg bg-muted p-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-24" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-10" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
