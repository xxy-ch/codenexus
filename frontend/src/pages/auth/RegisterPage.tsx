import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { FieldGroup } from '@/components/page/FieldGroup'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import type { RegisterRequest } from '@/types/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, isAuthenticated, isLoading } = useAuth()
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    password: '',
    email: '',
    display_name: '',
    organization_id: 1,
    campus_id: 1,
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    if (!formData.username) {
      errors.username = 'Username is required'
    } else if (!/^[0-9]+$/.test(formData.username)) {
      errors.username = 'Username must be numeric only'
    }

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!agreedToTerms) {
      errors.terms = 'Please accept the terms to continue'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await register(formData)
      if (!result.success) {
        setError(result.error || 'Registration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)

    if (validationErrors.confirmPassword) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next.confirmPassword
        return next
      })
    }
  }

  if (isLoading) {
    return <Loading message="Loading registration..." />
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PageHeader
            eyebrow="Account setup"
            title="Create your account"
            description="Set up your profile once and use it across problems classes and contests."
            className="border-slate-200 bg-slate-50"
          />

          <SurfaceCard className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-950">Registration</h2>
              <p className="text-sm leading-6 text-slate-600">
                Keep the form compact and complete only the fields required by the current platform.
              </p>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup label="Display name" description="Optional. This is shown next to your submissions and posts.">
                <Input
                  name="display_name"
                  type="text"
                  autoComplete="nickname"
                  placeholder="Student 2001"
                  value={formData.display_name || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </FieldGroup>

              <FieldGroup label="Username">
                <Input
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="2001"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.username}
                />
              </FieldGroup>

              <FieldGroup label="Email address">
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.email}
                />
              </FieldGroup>

              <FieldGroup label="Password" description="At least 6 characters. Use a password manager if this is a shared device.">
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.password}
                />
              </FieldGroup>

              <FieldGroup label="Confirm password">
                <Input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat the password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  disabled={isSubmitting}
                  error={validationErrors.confirmPassword}
                />
              </FieldGroup>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <label className="flex items-start gap-3 text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked)
                      if (validationErrors.terms) {
                        setValidationErrors((prev) => {
                          const next = { ...prev }
                          delete next.terms
                          return next
                        })
                      }
                    }}
                    disabled={isSubmitting}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {validationErrors.terms ? (
                  <p className="text-sm text-rose-700">{validationErrors.terms}</p>
                ) : null}
              </div>

              <Button type="submit" fullWidth disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span>Already have an account?</span>
              <Link to="/login" className="font-medium text-slate-900 underline-offset-4 hover:underline">
                Sign in instead
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </main>
  )
}
