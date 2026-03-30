import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const avatarLetter = (user?.display_name?.[0] || user?.username?.[0] || '用').toUpperCase()

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextQuery = query.trim()
    navigate(nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}` : '/search')
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-[rgba(250,248,255,0.78)] backdrop-blur-xl">
      <div className="flex items-center justify-between px-8 py-3 w-full max-w-[1440px] mx-auto">
        <div className="flex items-center gap-8 flex-1">
          <span className="text-xl font-bold tracking-tighter text-[#17305e] font-['Manrope']">
            建筑算法学社
          </span>
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full max-w-md"
          >
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#93a0bb] text-lg" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="搜索题目、竞赛或用户"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="全局搜索"
              className="w-full bg-[rgb(var(--surface-container-low-rgb,242,243,255))] border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#003d9b]/20 placeholder:text-[#93a0bb] text-[#17305e]"
            />
          </form>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/settings?tab=notifications"
            aria-label="通知设置"
            className="p-2 text-[#667896] hover:bg-white/50 rounded-full transition-colors active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          </Link>
          <Link
            to="/settings"
            aria-label="设置"
            className="p-2 text-[#667896] hover:bg-white/50 rounded-full transition-colors active:scale-95 duration-150"
          >
            <span className="material-symbols-outlined" aria-hidden="true">settings</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-full hover:bg-white/50 transition-colors p-1"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[rgba(196,210,255,0.8)] bg-[#dae2ff] flex items-center justify-center font-semibold text-[#003d9b]">
              {avatarLetter}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
