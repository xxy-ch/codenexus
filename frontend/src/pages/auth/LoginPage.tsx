import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LockKeyhole, UserRound } from 'lucide-react'
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
      setLocalError(result.error ?? 'Sign in failed')
    }
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg-rgb))] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto grid max-w-[1280px] gap-6 overflow-hidden rounded-[12px] bg-[rgba(255,255,255,0.92)] shadow-[0_32px_80px_rgba(19,27,46,0.08)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden bg-[rgba(242,243,255,0.96)] px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(218,226,253,0.92),transparent_34%),linear-gradient(160deg,rgba(255,255,255,0.72),rgba(242,243,255,0.96))]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/88 px-4 py-2 text-sm font-semibold text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.04)]">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] text-white">
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">code</span>
              </span>
              AlgoMaster Workspace
            </div>
            <div className="mt-14 max-w-[30rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Architectural Scholar</p>
              <h1 className="mt-5 font-['Manrope'] text-[3.6rem] font-extrabold leading-[0.94] tracking-[-0.06em] text-[#131b2e]">
                让题面、代码和判题
                <span className="block text-[#003d9b]">回到一个深度工作的界面。</span>
              </h1>
              <p className="mt-6 max-w-[28rem] text-[15px] leading-7 text-[#5f6d87]">
                这里不是黑框白底的模板后台。它应该像一套严肃、紧凑、可持续使用的在线评测工作台。
              </p>
            </div>
          </div>

          <div className="relative z-10 grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['统一账号', '支持字母用户名和旧 user_id 兼容登录'],
                ['真实工作流', '题库、提交、比赛、教学后台保持真实 API'],
                ['紧凑信息', '标签、元信息、状态都尽量横向收口'],
              ].map(([title, detail]) => (
                <div key={title} className="rounded-[10px] bg-white/84 p-4 shadow-[0_10px_24px_rgba(19,27,46,0.04)]">
                  <p className="text-sm font-semibold text-[#17305e]">{title}</p>
                  <p className="mt-2 text-xs leading-5 text-[#65748d]">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mx-auto max-w-[26rem]">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-3 rounded-full bg-[rgba(242,243,255,0.92)] px-4 py-2 text-sm font-semibold text-[#17305e]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] text-white">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">code</span>
                </span>
                AlgoMaster Workspace
              </div>
            </div>

            <div className="mt-6 lg:mt-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Sign in</p>
              <h2 className="mt-3 font-['Manrope'] text-[2.2rem] font-extrabold tracking-[-0.05em] text-[#131b2e]">Welcome back</h2>
              <p className="mt-3 text-sm leading-6 text-[#5f6d87]">
                Use your account identifier and password to enter the workspace.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">
                  <UserRound className="h-4 w-4" />
                  Username / User ID
                </span>
                <Input
                  aria-label="Username / User ID"
                  placeholder="1001 或 alice"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">
                  <LockKeyhole className="h-4 w-4" />
                  Password
                </span>
                <Input
                  aria-label="Password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {(localError || error) ? (
                <div className="rounded-[8px] bg-[rgba(255,218,214,0.84)] px-4 py-3 text-sm text-[#93000a]">
                  {localError || error}
                </div>
              ) : null}

              <div className="pt-2">
                <Button type="submit" size="lg" fullWidth disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </form>

            <div className="mt-8 flex items-center justify-between gap-3 text-sm text-[#65748d]">
              <span>首次使用？</span>
              <Link className="font-semibold text-[#003d9b]" to="/register">
                Create Account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LoginPage
