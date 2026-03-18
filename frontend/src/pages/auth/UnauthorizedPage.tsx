import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'

export function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageHeader
            eyebrow="Access"
            title="You do not have access"
            description="The current account is authenticated, but it is not allowed to open this area."
            className="border-slate-200 bg-slate-50"
          />

          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">What you can do</h2>
              <p className="text-sm leading-6 text-slate-600">
                Go back to the last safe page or return to the dashboard and switch context.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                Teacher and admin routes are guarded separately from general problem access.
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                If this account should have access, the role mapping still needs adjustment.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => window.history.back()} className="sm:flex-1">
                Go back
              </Button>
              <Button as={Link} to="/dashboard" variant="outline" className="sm:flex-1">
                Return to dashboard
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
