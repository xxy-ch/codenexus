import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

interface IDESkeletonProps {
  className?: string
}

export function IDESkeleton({ className }: IDESkeletonProps) {
  return (
    <div className={cn('-m-8 overflow-hidden bg-[#eef2f7]', className)}>
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Left panel: problem description */}
        <section className="border-b border-border bg-card xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col">
            {/* Problem title header */}
            <div className="border-b border-border px-8 py-8">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 space-y-3">
                  <Skeleton className="h-8 w-2/3" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            </div>

            {/* Problem content */}
            <div className="flex-1 px-8 py-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-muted p-5">
                      <Skeleton className="h-4 w-24 mb-3" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-12" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-14" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right panel: code editor */}
        <section className="bg-[#0f172a]">
          <div className="flex h-full flex-col">
            {/* Editor toolbar */}
            <div className="flex items-center justify-end gap-3 border-b border-slate-800 px-6 py-4">
              <Skeleton className="h-9 w-36 rounded-xl bg-slate-800" />
              <Skeleton className="h-9 w-20 rounded-xl bg-blue-700" />
            </div>

            {/* Editor area */}
            <div className="flex-1 p-4">
              <div className="space-y-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={`editor-line-${i}`} className="h-5 w-full bg-slate-800" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
