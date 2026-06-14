import { Skeleton } from '@/shared/components/Skeleton'
import { cn } from '@/shared/lib/utils'

interface ConversationSkeletonProps {
  className?: string
}

export function ConversationSkeleton({ className }: ConversationSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header banner */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`stat-${i}`} className="rounded-xl border px-4 py-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-6 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation sidebar + chat area */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Sidebar: conversation list */}
        <div className="space-y-4">
          <div className="rounded-[24px] border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`conv-${i}`} className="flex items-center gap-3 rounded-xl p-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="rounded-[24px] border border-border bg-card shadow-sm">
          {/* Chat header */}
          <div className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>

          {/* Message bubbles */}
          <div className="space-y-4 p-6">
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-xl bg-secondary px-4 py-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] rounded-xl bg-primary/10 px-4 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[70%] rounded-xl bg-secondary px-4 py-3">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] rounded-xl bg-primary/10 px-4 py-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-16" />
              </div>
            </div>
          </div>

          {/* Message input */}
          <div className="border-t border-border px-6 py-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1 rounded-xl" />
              <Skeleton className="h-10 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
