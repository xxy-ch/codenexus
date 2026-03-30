import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { login, isLoading, error } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)

    const result = await login({
      username: username.trim(),
      password,
    })

    if (!result.success) {
      setLocalError(result.error ?? '登录失败，请检查账号和密码')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-8">
      <div
        data-testid="login-card"
        className="grid min-h-[640px] w-full max-w-[1200px] overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm md:min-h-[720px] md:grid-cols-12"
      >
        {/* Brand Visual Side */}
        <section className="relative hidden min-h-[720px] overflow-hidden bg-surface-container-low px-12 py-12 md:col-span-5 md:flex md:flex-col md:justify-between lg:col-span-7 lg:px-14 lg:py-14">
          {/* Decorative background elements */}
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
              Where Code Meets{' '}
              <span className="text-primary-container">Architectural Precision.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-on-surface-variant">
              Access the world's most sophisticated editorial workspace for competitive programming and deep-work algorithmic design.
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
              Joined by 12k+ scholars this week
            </span>
          </div>
        </section>

        {/* Login Form Side */}
        <section
          data-testid="login-form-shell"
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
              <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">Welcome back</h2>
              <p className="text-on-surface-variant font-medium">Continue your deep-work journey.</p>
            </div>

            {/* Social Logins */}
            <div className="mb-8 grid grid-cols-2 gap-4">
              {['Google', 'GitHub'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/15 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface opacity-70 transition-colors hover:bg-surface-container-high"
                >
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">
                    {provider === 'Google' ? 'public' : 'code'}
                  </span>
                  <span>{provider}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="relative mb-8 flex items-center">
              <div className="flex-grow border-t border-outline-variant/30" />
              <span className="px-4 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/56">
                or use email
              </span>
              <div className="flex-grow border-t border-outline-variant/30" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Username / User ID
                </span>
                <div
                  data-testid="login-input-shell"
                  className="relative rounded-lg border border-outline-variant/32 bg-surface-container/98 shadow-sm transition-all duration-200 focus-within:border-primary/24 focus-within:bg-white focus-within:shadow-md"
                >
                  <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
                    person
                  </span>
                  <Input
                    aria-label="Username / User ID"
                    autoComplete="username"
                    className="bg-transparent py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                    placeholder="1001 or alice"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Password
                  </span>
                  <Link className="text-[11px] font-semibold text-primary hover:underline underline-offset-4" to="/account-recovery">
                    Forgot password?
                  </Link>
                </div>
                <div
                  data-testid="login-input-shell"
                  className="relative rounded-lg border border-outline-variant/32 bg-surface-container/98 shadow-sm transition-all duration-200 focus-within:border-primary/24 focus-within:bg-white focus-within:shadow-md"
                >
                  <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
                    lock
                  </span>
                  <Input
                    aria-label="Password"
                    autoComplete="current-password"
                    className="bg-transparent py-3 pl-12 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>

              {(localError || error) ? (
                <div className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">
                  {localError || error}
                </div>
              ) : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="gradient"
                  size="lg"
                  fullWidth
                  disabled={isLoading}
                  leftIcon={
                    isLoading ? null : (
                      <span className="material-symbols-outlined text-base" data-testid="login-submit-icon">arrow_forward</span>
                    )
                  }
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            <div className="mt-10 text-center text-sm text-on-surface-variant">
              <span>Don't have an account?</span>
              <Link className="ml-1 font-bold text-primary hover:underline underline-offset-4" to="/register">
                Sign up
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

export default LoginPage
