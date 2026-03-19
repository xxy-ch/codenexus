import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: '首页', path: '/dashboard', icon: 'dashboard' },
  { label: '题库', path: '/problems', icon: 'terminal' },
  { label: '竞赛', path: '/contests', icon: 'trophy' },
  { label: '讨论', path: '/discussions', icon: 'forum' },
  { label: '我的', path: '/profile', icon: 'person' },
]

export function MobileNav() {
  const location = useLocation()

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors',
                isActive
                  ? 'text-slate-950 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              )}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
