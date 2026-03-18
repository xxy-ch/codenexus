import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function NotFound() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageHeader
            eyebrow="404"
            title="Page not found"
            description="The route exists in the browser history, but there is no page mounted at this address."
            className="border-slate-200 bg-slate-50"
          />

          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">Suggested recovery</h2>
              <p className="text-sm leading-6 text-slate-600">
                Continue from a stable entry point instead of refreshing a stale or incomplete route.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Check the navigation path, the copied URL, or whether the resource was removed during the redesign.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/dashboard" className="sm:flex-1">
                Open dashboard
              </Button>
              <Button as={Link} to="/problems" variant="outline" className="sm:flex-1">
                Browse problems
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
