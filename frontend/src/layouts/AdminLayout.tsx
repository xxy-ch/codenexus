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
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 lg:flex lg:flex-col">
        <Link to="/admin" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-950 dark:text-slate-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">shield</span>
          </span>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Operations</div>
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
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
                )}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Admin pages now share the same shell family as the main workspace, with denser navigation and flatter surfaces.
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 md:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Admin workspace</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-slate-100">Operations and moderation</div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                aria-label="Return to user workspace"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
