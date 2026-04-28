import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4 mx-auto">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-4xl">
                lock
              </span>
            </div>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Button
                variant="outline"
                as={Link}
                to="/dashboard"
              >
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}