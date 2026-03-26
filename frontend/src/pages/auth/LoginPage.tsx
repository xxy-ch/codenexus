import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react'
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
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--page-bg-rgb))] p-6 md:p-8">
      <div
        data-testid="login-card"
        className="grid min-h-[640px] w-full max-w-[1200px] overflow-hidden rounded-xl bg-[rgba(255,255,255,0.96)] shadow-[0_30px_70px_rgba(19,27,46,0.08)] md:min-h-[720px] md:grid-cols-12"
      >
        <section className="relative hidden min-h-[720px] overflow-hidden bg-[rgb(var(--sidebar-bg-rgb))] px-12 py-12 md:col-span-5 md:flex md:flex-col md:justify-between lg:col-span-7 lg:px-14 lg:py-14">
          <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[rgba(0,82,204,0.10)] blur-3xl" />
          <div className="absolute right-10 top-1/2 hidden w-64 -translate-y-1/2 rotate-3 rounded-lg border border-[rgba(195,198,214,0.22)] bg-white/80 p-6 shadow-[0_22px_44px_rgba(19,27,46,0.10)] backdrop-blur-xl lg:block">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#ba1a1a]" />
              <span className="h-3 w-3 rounded-full bg-[#68dba9]" />
              <span className="h-3 w-3 rounded-full bg-[#515f74]" />
            </div>
            <div className="space-y-3">
              <div className="h-2 w-3/4 rounded bg-[#dae2ff]" />
              <div className="h-2 w-full rounded bg-[rgba(195,198,214,0.35)]" />
              <div className="h-2 w-1/2 rounded bg-[rgba(195,198,214,0.35)]" />
            </div>
            <div className="mt-6 text-right text-[10px] font-semibold uppercase tracking-[0.24em] text-[#003d9b]">
              当前状态：已就绪
            </div>
          </div>

          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-[#003d9b]" aria-hidden="true">
                architecture
              </span>
              <span className="font-['Manrope'] text-2xl font-black tracking-[-0.05em] text-[#003d9b]">
                建筑算法学社
              </span>
            </div>

            <h1 className="max-w-[36rem] font-['Manrope'] text-[3.35rem] font-extrabold leading-[0.95] tracking-[-0.06em] text-[#131b2e]">
              在结构化训练里
              <span className="block text-[#0052cc]">保持代码表达的精确度。</span>
            </h1>
            <p className="mt-6 max-w-[30rem] text-lg leading-8 text-[#5f6d87]">
              统一进入题库、竞赛、课程与讨论区，在同一套工作台里完成算法训练与提交。
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
                  alt={`成员头像 ${index + 1}`}
                  className="h-10 w-10 rounded-full border-2 border-[rgb(var(--sidebar-bg-rgb))] object-cover"
                  src={src}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-[#65748d]">本周已有 12k+ 用户继续训练计划</span>
          </div>
        </section>

        <section
          data-testid="login-form-shell"
          className="flex min-h-[640px] flex-col justify-between p-8 md:col-span-7 md:min-h-[720px] md:p-12 lg:col-span-5 lg:p-16"
        >
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
            <div className="mb-8 flex items-center gap-2 md:hidden">
              <span className="material-symbols-outlined text-[28px] text-[#003d9b]" aria-hidden="true">
                architecture
              </span>
              <span className="font-['Manrope'] text-lg font-bold text-[#003d9b]">建筑算法学社</span>
            </div>

            <div className="mb-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">账号登录</p>
              <h2 className="mt-3 font-['Manrope'] text-3xl font-bold tracking-[-0.05em] text-[#131b2e]">欢迎回来</h2>
              <p className="mt-2 text-sm font-medium text-[#5f6d87]">继续你的刷题、竞赛与课程协作流程。</p>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-4">
              {['Google', 'GitHub'].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(195,198,214,0.22)] bg-[rgba(242,243,255,0.92)] px-4 py-3 text-sm font-semibold text-[#445472] opacity-70"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    {provider === 'Google' ? 'public' : 'code'}
                  </span>
                  <span>{provider} 登录</span>
                </button>
              ))}
            </div>

            <div className="relative mb-8 flex items-center">
              <div className="flex-grow border-t border-[rgba(195,198,214,0.3)]" />
              <span className="px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(67,70,84,0.56)]">
                或使用账号密码
              </span>
              <div className="flex-grow border-t border-[rgba(195,198,214,0.3)]" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">
                  用户名 / 学号
                </span>
                <div
                  data-testid="login-input-shell"
                  className="relative rounded-[14px] border border-[rgba(195,198,214,0.32)] bg-[rgba(234,237,255,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(19,27,46,0.04)] transition-all duration-200 focus-within:border-[rgba(12,86,208,0.24)] focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_4px_rgba(12,86,208,0.08)]"
                >
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6d87]" />
                  <Input
                    aria-label="Username / User ID"
                    autoComplete="username"
                    className="bg-transparent py-4 pl-12 pr-4 text-[15px] text-[#17305e] placeholder:text-[#8d98b3] shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                    style={{ paddingTop: '1rem', paddingRight: '1rem', paddingBottom: '1rem', paddingLeft: '3rem' }}
                    placeholder="1001 或 alice"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">
                    密码
                  </span>
                  <Link className="text-[11px] font-semibold text-[#003d9b] hover:underline underline-offset-4" to="/account-recovery">
                    找回账号
                  </Link>
                </div>
                <div
                  data-testid="login-input-shell"
                  className="relative rounded-[14px] border border-[rgba(195,198,214,0.32)] bg-[rgba(234,237,255,0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_10px_24px_rgba(19,27,46,0.04)] transition-all duration-200 focus-within:border-[rgba(12,86,208,0.24)] focus-within:bg-white focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_0_4px_rgba(12,86,208,0.08)]"
                >
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f6d87]" />
                  <Input
                    aria-label="Password"
                    autoComplete="current-password"
                    className="bg-transparent py-4 pl-12 pr-4 text-[15px] text-[#17305e] placeholder:text-[#8d98b3] shadow-none focus-visible:bg-transparent focus-visible:ring-0"
                    style={{ paddingTop: '1rem', paddingRight: '1rem', paddingBottom: '1rem', paddingLeft: '3rem' }}
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </label>

              {(localError || error) ? (
                <div className="rounded-[8px] bg-[rgba(255,218,214,0.84)] px-4 py-3 text-sm text-[#93000a]">
                  {localError || error}
                </div>
              ) : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  disabled={isLoading}
                  className="border border-[rgba(0,61,155,0.06)] text-base font-extrabold tracking-[-0.02em] text-white shadow-[0_18px_36px_rgba(0,61,155,0.24)] hover:scale-[1.01] active:scale-[0.985]"
                  style={{ backgroundImage: 'linear-gradient(135deg, #003d9b 0%, #0052cc 100%)' }}
                >
                  {isLoading ? '登录中...' : '进入工作台'}
                  <ArrowRight data-testid="login-submit-icon" className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="mt-10 text-center text-sm text-[#65748d]">
              <span>还没有账号？</span>
              <Link className="ml-1 font-bold text-[#003d9b] hover:underline underline-offset-4" to="/register">
                立即注册
              </Link>
            </div>
          </div>

          <footer className="mx-auto mt-12 w-full max-w-md border-t border-[rgba(195,198,214,0.16)] pt-8">
            <div className="flex flex-wrap justify-center gap-6 text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(67,70,84,0.56)] md:justify-start">
              <span>隐私说明</span>
              <span>服务状态</span>
              <span>版本记录</span>
            </div>
          </footer>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
