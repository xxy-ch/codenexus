import { Bell, Code2, LogOut, Plus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export function TopBar() {
  const { user, logout } = useAuthStore()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-outline-variant bg-surface-container-lowest/90 px-4 backdrop-blur-sm sm:px-5">
      <div className="hidden w-full max-w-md items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-on-surface-variant shadow-sm sm:flex">
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm">search 题目和讨论...</span>
        <span className="ml-auto rounded border border-outline-variant px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant">⌘K</span>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <button className="relative rounded-md p-2 text-on-surface-variant hover:bg-surface-container-high" aria-label="通知">
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
        </button>
        <Link to="/ide" className="hidden items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary shadow-sm hover:bg-primary/90 sm:flex">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          新建提交
        </Link>
        <Link to="/ide" className="rounded-md p-2 text-on-surface-variant hover:bg-surface-container-high sm:hidden" aria-label="新建提交">
          <Code2 className="h-4 w-4" aria-hidden="true" />
        </Link>
        <span className="text-xs font-semibold text-on-surface">{user?.username}</span>
        <button
          onClick={logout}
          className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          aria-label="退出登录"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
