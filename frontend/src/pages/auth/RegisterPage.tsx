import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
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
      errors.email = 'Please enter your email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email'
    }

    if (!formData.username) {
      errors.username = 'Please enter a username'
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters'
    }

    if (!formData.password) {
      errors.password = 'Please enter a password'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (formData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!agreedToTerms) {
      errors.terms = 'Please agree to the terms and conditions'
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
        setError(result.error || 'Registration failed, please try again')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
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
    return <LoadingState message="Loading registration page..." />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
      <div
        data-testid="register-card"
        className="grid min-h-[640px] w-full max-w-[1200px] overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm md:min-h-[720px] md:grid-cols-12"
      >
        {/* Brand Visual Side */}
        <section className="relative hidden min-h-[720px] overflow-hidden bg-surface-container-low px-12 py-12 md:col-span-5 md:flex md:flex-col md:justify-between lg:col-span-7 lg:px-14 lg:py-14">
          {/* Decorative elements */}
          <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-primary-container/10 blur-3xl" />
          <div className="absolute right-10 top-1/2 hidden w-64 -translate-y-1/2 rotate-3 rounded-lg border border-outline-variant/15 bg-surface-bright/80 p-6 shadow-xl backdrop-blur-xl lg:block">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-error" />
              <div className="h-3 w-3 rounded-full bg-tertiary-fixed-dim" />
              <div className="h-3 w-3 rounded-full bg-secondary" />
            </div>
            <div className="space-y-3">
              <div className="h-2 w-3/4 rounded bg-primary-fixed" />
              <div className="h-2 w-full rounded bg-outline-variant/30" />
              <div className="h-2 w-1/2 rounded bg-outline-variant/30" />
            </div>
            <div className="mt-6 text-right text-[10px] font-mono font-bold text-primary">
              STATUS: ACCEPTED
            </div>
          </div>

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary" aria-hidden="true">
                architecture
              </span>
              <span className="font-headline text-2xl font-black tracking-tighter text-primary">
                Online Judge
              </span>
            </div>

            <h1 className="font-headline text-5xl font-extrabold tracking-tight text-on-surface">
              Join the{' '}
              <span className="text-primary-container">Architectural Scholar</span>{' '}
              Community
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-on-surface-variant">
              Create your researcher account and access the world's most sophisticated workspace for competitive programming.
            </p>
          </div>

          <div className="relative z-10 mt-12 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[
                'https://lh3.googleusercontent.com/aida-public/AB6AXuB3KkJ4pvv6ZgMk3vzTdOJXY2EYcn13dLS1JhOd6hzIMlTIt2aNlCJAwQUTXn0GYh17OfAwOIcg_iWw6XSA9eklPza6x22eKBjRD02Rd5thLznZy9m-D32RlVCOpwIyqMCsEzHDr4zL0PD_T_kbjqmQ9gj5Vg_GPk_BW75WNw1HdM-R1LTYhTStNmj6j0OEu9UwQMjhwl_Q4TTyHTKXHCDJ0bHyc9yI6FJ4GnTrnzpNNNDmPfLlP_gpghutz1atpTzLJX-IaDADVcie',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuDWQ0-BujjjQs7scCXJhDLr5RFYakLNOhjhfSaZuH5h78XPeXdXCzt_vHo3dC8PGqxgycc9YYztQmDpSqZ3Mrz4ytIkKGwDDIAqfS1DIWYXYhwl1r1mzlbs217CakYT9lmTYSDfLldZ-Qycl_UBpFdM1A2OhgQ0idHr_reCD_h4shvm16M-kt5K-nA5cgBx7KDsuJuW-RYLyZixDb_5dOaH2uXzW-hczWmNFew6pcJMxqI5fPYlHKXrsH0Tunzin6KIUazovc8rLGh7',
                'https://lh3.googleusercontent.com/aida-public/AB6AXuC18_TD3DeONHvY90CAjTbQU4Hd2nxVfPz2vFWi3d82aXXVdD94ZlQoZWrp3H7HVjaPGXctkaSRnHRWWCvsqgfJxaoHFBbYZuIIUc5O5ZwbACZyApGiEi3x9bRTzIsEIM47bxLmk1KggcYuCBKYf_XAVgBLm1ZBHUSJ3LwKjn4x3kQy1Y5l6Bseov6uAWF_4iNAfd7GdeE5RafTe2Fr1FvcwXsVvJaSgkGIwO7gt2VBf7jojfSte5OPc_WunCiXKdGNydLqZ13uEZi1',
              ].map((src, index) => (
                <img
                  key={src}
                  alt={`Contributor avatar ${index + 1}`}
                  className="h-10 w-10 rounded-full border-2 border-surface-container-low object-cover"
                  src={src}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-on-surface-variant">
              Joined by 12k+ scholars worldwide
            </span>
          </div>
        </section>

        {/* Registration Form Side */}
        <section
          data-testid="register-form-shell"
          className="flex min-h-[640px] flex-col justify-between p-8 md:col-span-7 md:min-h-[720px] md:p-12 lg:col-span-5 lg:p-16"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            {/* Mobile Header */}
            <div className="mb-8 flex items-center gap-2 md:hidden">
              <span className="material-symbols-outlined text-2xl text-primary" aria-hidden="true">
                architecture
              </span>
              <span className="font-headline text-lg font-bold text-primary">Online Judge</span>
            </div>

            <div className="mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Create Account
              </p>
              <h2 className="mt-3 font-headline text-3xl font-bold text-on-surface">
                Join our community
              </h2>
              <p className="mt-2 text-sm font-medium text-on-surface-variant">
                Start your competitive programming journey today.
              </p>
            </div>

            {error ? (
              <div className="mb-6 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                {
                  label: 'Display Name',
                  name: 'display_name',
                  type: 'text',
                  autoComplete: 'nickname',
                  placeholder: 'e.g. Zhang San',
                  value: formData.display_name || '',
                  error: undefined,
                  onChange: handleChange,
                },
                {
                  label: 'Username',
                  name: 'username',
                  type: 'text',
                  autoComplete: 'username',
                  placeholder: 'e.g. zhangsan01',
                  value: formData.username,
                  error: validationErrors.username,
                  onChange: handleChange,
                },
                {
                  label: 'Email Address',
                  name: 'email',
                  type: 'email',
                  autoComplete: 'email',
                  placeholder: 'name@example.com',
                  value: formData.email,
                  error: validationErrors.email,
                  onChange: handleChange,
                },
                {
                  label: 'Password',
                  name: 'password',
                  type: 'password',
                  autoComplete: 'new-password',
                  placeholder: 'Enter a password',
                  value: formData.password,
                  error: validationErrors.password,
                  onChange: handleChange,
                },
                {
                  label: 'Confirm Password',
                  name: 'confirmPassword',
                  type: 'password',
                  autoComplete: 'new-password',
                  placeholder: 'Confirm your password',
                  value: confirmPassword,
                  error: validationErrors.confirmPassword,
                  onChange: handleConfirmPasswordChange,
                },
              ].map((field) => (
                <label key={field.name} className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {field.label}
                  </span>
                  <div className="relative rounded-lg border border-outline-variant/32 bg-surface-container/98 shadow-sm transition-all duration-200 focus-within:border-primary/24 focus-within:bg-white focus-within:shadow-md">
                    <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
                      {field.name === 'email' ? 'email' : field.name === 'display_name' ? 'badge' : 'person'}
                    </span>
                    <Input
                      name={field.name}
                      type={field.type}
                      autoComplete={field.autoComplete}
                      placeholder={field.placeholder}
                      value={field.value}
                      onChange={field.onChange}
                      required={field.name !== 'display_name'}
                      disabled={isSubmitting}
                      className="bg-transparent py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                    />
                  </div>
                  {field.error ? (
                    <p className="mt-2 text-sm text-on-error-container">{field.error}</p>
                  ) : null}
                </label>
              ))}

              <div className="space-y-2 rounded-lg border border-outline-variant/24 bg-surface-container-low/72 px-4 py-3 text-sm text-on-surface-variant">
                <label className="flex items-start gap-3">
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
                    className="mt-0.5"
                  />
                  <span>
                    I have read and agree to the{' '}
                    <Link to="/terms" className="font-semibold text-primary hover:underline underline-offset-4">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="font-semibold text-primary hover:underline underline-offset-4">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {validationErrors.terms ? (
                  <p className="text-sm text-on-error-container">{validationErrors.terms}</p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-10 text-center text-sm text-on-surface-variant">
              <span>Already have an account?</span>
              <Link className="ml-1 font-bold text-primary hover:underline underline-offset-4" to="/login">
                Sign in
              </Link>
            </div>
          </div>

          <footer className="mx-auto mt-12 w-full max-w-md border-t border-outline-variant/16 pt-8">
            <div className="flex flex-wrap justify-center gap-6 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/56 md:justify-start">
              <span>Privacy</span>
              <span>Terms</span>
              <span>Status</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}
