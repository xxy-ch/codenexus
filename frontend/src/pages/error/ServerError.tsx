import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function ServerError() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageHeader
            eyebrow="500"
            title="Server unavailable"
            description="The request reached the platform, but the service did not complete it successfully."
            className="border-slate-200 bg-slate-50"
          />

          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">Immediate options</h2>
              <p className="text-sm leading-6 text-slate-600">
                Retry the request once. If it still fails, move back to a stable page and inspect the failing flow later.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Long-running requests, expired sessions, or backend deploy drift can all surface here.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => window.location.reload()} className="sm:flex-1">
                Refresh page
              </Button>
              <Button as={Link} to="/dashboard" variant="outline" className="sm:flex-1">
                Go to dashboard
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
