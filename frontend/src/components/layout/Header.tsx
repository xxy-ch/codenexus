import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 bg-[rgba(250,248,255,0.78)] px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="hidden font-['Manrope'] text-[1.3rem] font-extrabold tracking-[-0.04em] text-[#17305e] lg:inline">
            Architectural Scholar
          </span>
          <label className="relative flex w-full max-w-[360px] items-center gap-3 rounded-[16px] bg-[rgba(242,243,255,0.9)] px-4 py-3 text-sm text-[#60708f] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Search problems, contests or users..."
              className="w-full bg-transparent text-sm font-medium text-[#17305e] outline-none placeholder:text-[#93a0bb]"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#667896] transition-colors hover:bg-white/80 hover:text-[#17305e]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
          </button>
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#667896] transition-colors hover:bg-white/80 hover:text-[#17305e]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">settings</span>
          </Link>
          <div className="hidden h-8 w-px bg-[rgba(195,198,214,0.45)] md:block" />
          <Link to="/profile" className="flex items-center gap-3 rounded-[18px] px-2 py-1.5 transition-colors hover:bg-white/65">
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-[#17305e]">{user?.display_name || user?.username || 'Workspace User'}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6b7ca7]">
                {user?.role === 'admin' ? 'Admin' : user?.role === 'teacher' ? 'Teacher' : 'Student'}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(196,210,255,0.8)] bg-[#dae2ff] font-semibold text-[#003d9b]">
              {(user?.username?.[0] || 'U').toUpperCase()}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
