import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'Problems', path: '/problems', icon: 'code' },
  { label: 'Contests', path: '/contests', icon: 'trophy' },
  { label: 'IDE', path: '/ide', icon: 'terminal' },
  { label: 'Rankings', path: '/rankings', icon: 'leaderboard' },
  { label: 'Discussions', path: '/discussions', icon: 'forum' },
  { label: 'Submissions', path: '/submissions', icon: 'history' },
]

const adminItems = [
  { label: 'Admin Panel', path: '/admin', icon: 'settings' },
]

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-surface-container border-r border-outline-variant">
      <div className="flex h-16 items-center border-b border-outline-variant px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-bold text-sm">OJ</span>
          </div>
          <span className="font-display font-bold text-lg text-on-surface">Online Judge</span>
        </Link>
      </div>

      <nav className="mt-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-icons text-lg">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {isAdmin && (
        <div className="mt-6 px-3">
          <p className="px-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Admin</p>
          <ul className="mt-2 space-y-1">
            {adminItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-icons text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
