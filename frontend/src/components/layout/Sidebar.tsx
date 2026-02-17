import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

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
  { label: 'Discuss', path: '/discussions', icon: 'forum' },
  { label: 'Blog', path: '/blog', icon: 'article' },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  // Get user initials
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
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col justify-between">
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-slate-100 dark:border-slate-800/50">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-xl">code</span>
          </div>
          <span className="ml-3 font-semibold text-lg tracking-tight text-slate-700 dark:text-white">
            AlgoMaster
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'group flex items-center px-4 py-3 rounded-lg relative transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
                )}
              >
                <span className="material-symbols-outfilled mr-3 text-2xl">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white dark:ring-slate-800 shadow-sm hover:ring-primary transition-all"
          >
            {getUserInitials()}
          </Link>
          <div className="flex-1 overflow-hidden">
            <Link
              to="/profile"
              className="text-sm font-semibold truncate text-slate-900 dark:text-white hover:text-primary transition-colors"
            >
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || 'User'}
            </Link>
            <p className="text-xs text-slate-500 truncate dark:text-slate-400 capitalize">
              {user?.role || 'User'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              to="/settings"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Settings"
            >
              <span className="material-symbols-outlined text-xl">settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Logout"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}