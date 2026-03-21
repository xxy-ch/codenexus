import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { FEATURE_FLAGS } from '@/services/config'

export function AdminLayout() {
  const location = useLocation()

  const navigation = [
    { name: '仪表板', href: '/admin', icon: 'dashboard' },
    { name: '用户管理', href: '/admin/users', icon: 'group' },
    { name: '题目管理', href: '/admin/problems', icon: 'library_books' },
    { name: '判题设置', href: '/admin/judge-settings', icon: 'tune' },
    { name: '题面配置', href: '/admin/problem-content', icon: 'edit_document' },
    ...(FEATURE_FLAGS.plagiarism
      ? [
          { name: '相似度配置', href: '/admin/similarity-scan', icon: 'tune' },
          { name: '抄袭报告', href: '/admin/plagiarism-reports', icon: 'find_in_page' },
        ]
      : []),
  ]

  return (
    <div className="flex min-h-screen bg-[rgb(var(--page-bg-rgb))] text-slate-900 dark:text-slate-100">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,247,252,0.96))] px-4 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:flex lg:flex-col">
        <Link to="/admin" className="flex items-center gap-3 rounded-[26px] px-3 py-3 text-slate-950 dark:text-slate-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-blue-800 text-white shadow-[0_12px_28px_rgba(30,64,175,0.24)] dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">shield</span>
          </span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Operations</div>
            <div className="text-base font-semibold">Control Center</div>
          </div>
        </Link>

        <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Operations
        </div>
        <nav className="mt-3 space-y-1" aria-label="Admin navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-label={
                  item.href === '/admin/users'
                    ? 'Users'
                    : item.href === '/admin/problems'
                      ? 'Problem Management'
                      : item.name
                }
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[linear-gradient(180deg,rgba(219,234,254,0.95),rgba(239,246,255,0.95))] text-slate-950 shadow-[0_12px_24px_rgba(30,64,175,0.12)] dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-[rgba(255,255,255,0.88)] hover:text-slate-950 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
                )}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-[26px] border border-slate-200/90 bg-[rgba(255,255,255,0.72)] p-4 text-sm leading-6 text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Admin pages now share the same shell family as the main workspace, with denser navigation and flatter surfaces.
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 md:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Admin workspace</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-slate-100">Operations and moderation</div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                aria-label="Return to user workspace"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/80 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
                <span className="hidden sm:inline">Return to user workspace</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
