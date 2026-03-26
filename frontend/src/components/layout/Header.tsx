import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const displayName = user?.display_name || user?.username || '平台用户'
  const roleLabel = user?.role === 'admin' ? '管理员' : user?.role === 'teacher' ? '教师' : '学生'
  const avatarLetter = (user?.display_name?.[0] || user?.username?.[0] || '用').toUpperCase()

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextQuery = query.trim()
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : '/search')
  }

  return (
    <header className="sticky top-0 z-30 bg-[rgba(250,248,255,0.78)] px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="hidden font-['Manrope'] text-[1.3rem] font-extrabold tracking-[-0.04em] text-[#17305e] lg:inline">
            建筑算法学社
          </span>
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex h-[52px] w-full max-w-[400px] items-center gap-3 rounded-[18px] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] text-sm text-[#60708f] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_28px_rgba(19,27,46,0.05)]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="搜索题目、竞赛或用户"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="全局搜索"
              className="w-full bg-transparent text-sm font-medium text-[#17305e] outline-none placeholder:text-[#93a0bb]"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            to="/settings?tab=notifications"
            aria-label="通知设置"
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#667896] transition-colors hover:bg-white/80 hover:text-[#17305e]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
          </Link>
          <Link
            to="/settings"
            aria-label="设置"
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#667896] transition-colors hover:bg-white/80 hover:text-[#17305e]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">settings</span>
          </Link>
          <div className="hidden h-8 w-px bg-[rgba(195,198,214,0.45)] md:block" />
          <Link to="/profile" className="flex items-center gap-3 rounded-[18px] px-2 py-1.5 transition-colors hover:bg-white/65">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-[#17305e]">{displayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6b7ca7]">
                {roleLabel}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(196,210,255,0.8)] bg-[#dae2ff] font-semibold text-[#003d9b]">
              {avatarLetter}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
