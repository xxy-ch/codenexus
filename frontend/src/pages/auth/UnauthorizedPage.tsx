import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-2xl">
        <Card className="p-8 md:p-12">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <span className="material-symbols-outlined text-5xl">lock</span>
            </div>

            {/* Title */}
            <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
              Access Denied
            </h1>

            {/* Description */}
            <p className="text-on-surface-variant mb-8 max-w-md">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => window.history.back()}
                variant="outline"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Go Back
              </Button>
              <Button as={Link} to="/dashboard" variant="primary">
                <span className="material-symbols-outlined text-lg">dashboard</span>
                Go to Dashboard
              </Button>
            </div>

            {/* Additional Info */}
            <div className="mt-8 rounded-lg bg-surface-container-low/50 p-4 text-sm text-on-surface-variant">
              <p className="font-semibold mb-2">Need help?</p>
              <p>Contact your administrator or check your account permissions.</p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
