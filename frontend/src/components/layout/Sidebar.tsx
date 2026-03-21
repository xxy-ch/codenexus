import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { FEATURE_FLAGS } from '@/services/config'

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Problems', path: '/problems', icon: 'terminal' },
  { label: 'Submissions', path: '/submissions', icon: 'history' },
  { label: 'Contests', path: '/contests', icon: 'trophy', badge: 2 },
  { label: 'Ranking', path: '/ranking', icon: 'leaderboard' },
  { label: 'Roadmap', path: '/roadmap', icon: 'route' },
  { label: 'Discuss', path: '/discussions', icon: 'forum' },
  { label: 'Blog', path: '/blog', icon: 'article' },
  ...(FEATURE_FLAGS.directMessages ? [{ label: 'Messages', path: '/messages', icon: 'mail' }] : []),
  { label: 'Classes', path: '/teacher/classes', icon: 'group' },
  { label: 'Contest Wizard', path: '/teacher/contest-wizard', icon: 'build' },
  { label: 'Reports', path: '/teacher/assignment-report', icon: 'insights' },
]

const COLLAPSED_STORAGE_KEY = 'sidebar-collapsed'
const AUTO_COLLAPSE_BREAKPOINT = 1024
const EXPANDED_WIDTH = '16rem'
const COLLAPSED_WIDTH = '5rem'

function canUseWindow() {
  return typeof window !== 'undefined'
}

function getAutoCollapsedState() {
  return canUseWindow() ? window.innerWidth < AUTO_COLLAPSE_BREAKPOINT : false
}

function getStoredManualPreference() {
  if (!canUseWindow()) {
    return false
  }

  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isAutoCollapsed, setIsAutoCollapsed] = useState(() => getAutoCollapsedState())
  const [manualCollapsed, setManualCollapsed] = useState(() => getStoredManualPreference())

  const collapsed = isAutoCollapsed || manualCollapsed

  useEffect(() => {
    if (!canUseWindow()) {
      return
    }

    const updateCollapsedState = () => {
      setIsAutoCollapsed(window.innerWidth < AUTO_COLLAPSE_BREAKPOINT)
    }

    updateCollapsedState()
    window.addEventListener('resize', updateCollapsedState)
    return () => window.removeEventListener('resize', updateCollapsedState)
  }, [])

  useEffect(() => {
    if (!canUseWindow()) {
      return
    }

    document.documentElement.style.setProperty('--sidebar-shell-width', collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)
    return () => {
      document.documentElement.style.setProperty('--sidebar-shell-width', EXPANDED_WIDTH)
    }
  }, [collapsed])

  const toggleSidebar = () => {
    const nextManualCollapsed = !manualCollapsed
    setManualCollapsed(nextManualCollapsed)

    if (canUseWindow()) {
      try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, nextManualCollapsed ? 'true' : 'false')
      } catch {
        // ignore storage failures
      }
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <aside
      aria-label="Global sidebar"
      className={cn(
        'flex shrink-0 flex-col justify-between border-r border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,247,252,0.96))] backdrop-blur-xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-950/95',
        collapsed ? 'w-20' : 'w-64',
      )}
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      <div>
        <div
          className={cn(
            'relative flex h-16 items-center border-b border-slate-200 px-4 dark:border-slate-800',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <Link
            to="/dashboard"
            aria-label="AlgoMaster dashboard"
            title="AlgoMaster dashboard"
            className={cn('flex items-center text-slate-900 dark:text-slate-100', collapsed ? 'justify-center' : 'gap-3')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-100 bg-blue-800 text-white shadow-[0_12px_28px_rgba(30,64,175,0.24)] dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                code
              </span>
            </span>
            {!collapsed && (
              <div>
                <span className="block text-lg font-semibold tracking-tight">AlgoMaster</span>
                <span className="block text-[11px] uppercase tracking-[0.24em] text-slate-500">Workspace</span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="absolute right-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] text-slate-600 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        <nav className={cn('mt-4 space-y-1 px-2', collapsed && 'px-1')}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                title={item.label}
                className={cn(
                  'group relative flex cursor-pointer items-center rounded-2xl transition-all duration-200',
                  collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3',
                  isActive
                    ? 'bg-[linear-gradient(180deg,rgba(219,234,254,0.95),rgba(239,246,255,0.95))] text-slate-950 shadow-[0_12px_24px_rgba(30,64,175,0.12)] dark:bg-slate-800 dark:text-slate-50'
                    : 'text-slate-500 hover:bg-[rgba(255,255,255,0.88)] hover:text-slate-950 hover:shadow-[0_10px_24px_rgba(15,23,42,0.06)] dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100',
                )}
              >
                <span className={cn('material-symbols-outlined text-2xl', collapsed ? '' : 'mr-3')} aria-hidden="true">
                  {item.icon}
                </span>
                {collapsed ? <span className="sr-only">{item.label}</span> : <span className="font-medium">{item.label}</span>}
                {item.badge && !collapsed && (
                  <span className="ml-auto rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {item.badge}
                  </span>
                )}
                {isActive && <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-800 dark:bg-slate-100" />}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
        <div className={cn('flex items-center', collapsed ? 'justify-center gap-2' : 'gap-3')}>
          <Link
            to="/profile"
            aria-label="Profile"
            title="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-800 text-sm font-bold text-white shadow-[0_12px_24px_rgba(30,64,175,0.18)] transition-colors hover:bg-blue-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {getUserInitials()}
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <Link to="/profile" className="block truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User'}
              </Link>
              <p className="truncate text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{user?.role || 'User'}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              aria-label="Settings"
              title="Settings"
              className="rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-[rgba(255,255,255,0.9)] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                settings
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
              className="rounded-xl p-1.5 text-slate-500 transition-colors hover:bg-[rgba(255,255,255,0.9)] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                logout
              </span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
