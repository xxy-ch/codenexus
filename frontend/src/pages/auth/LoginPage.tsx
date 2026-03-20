import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { FieldGroup } from '@/components/page/FieldGroup'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'

interface LoginRequest {
  username: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await login(formData)
      if (!result.success) {
        setError(result.error || 'Sign in failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (isLoading) {
    return <Loading message="Loading sign-in..." />
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PageHeader
            eyebrow="Access"
            title="Welcome back"
            description="Use your account identifier and password to enter the workspace."
            className="border-slate-200 bg-slate-50"
          />

          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">Sign in</h2>
              <p className="text-sm leading-6 text-slate-600">
                Focus on the next submission. Everything else stays out of the way.
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup label="Username" description="Use the username or legacy account ID assigned to you.">
                <Input
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="alice01"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </FieldGroup>

              <FieldGroup label="Password">
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </FieldGroup>

              <div className="flex items-center justify-between gap-4 text-sm text-slate-600">
                <span>Standard account access only.</span>
                <Link to="/forgot-password" className="font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Need a new account?</span>
              <Link to="/register" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                Create account
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
