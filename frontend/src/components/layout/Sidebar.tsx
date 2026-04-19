import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { FEATURE_FLAGS } from '@/services/config'
import { isAdmin, isTeacherOrAbove, roleLabel, type Role } from '@/types/auth'

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
  minRole?: 'teacher' | 'admin'
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
  { label: 'Classes', path: '/teacher/classes', icon: 'group', minRole: 'teacher' },
  { label: 'Contest Wizard', path: '/teacher/contest-wizard', icon: 'build', minRole: 'teacher' },
  { label: 'Reports', path: '/teacher/assignment-report', icon: 'insights', minRole: 'teacher' },
  { label: 'Batch Ops', path: '/batch-operations', icon: 'upload_file', minRole: 'teacher' },
]

function canSeeItem(minRole: NavItem['minRole'], userRole: Role): boolean {
  if (!minRole) return true
  if (minRole === 'admin') return isAdmin(userRole)
  if (minRole === 'teacher') return isTeacherOrAbove(userRole)
  return true
}

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()

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

  const visibleItems = navItems.filter(
    (item) => !item.minRole || canSeeItem(item.minRole, user?.role ?? 'student')
  )

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col">
      {/* Logo */}
      <div className="h-12 flex items-center px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 bg-primary rounded-md flex items-center justify-center text-primary-foreground">
          <span className="material-symbols-outlined text-lg">code</span>
        </div>
        <span className="ml-2.5 text-sm font-semibold tracking-tight text-sidebar-foreground">
          CodeNexus
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <div className="space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <span className={cn(
                  'material-symbols-outlined text-[18px]',
                  isActive ? 'text-sidebar-primary' : ''
                )}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[11px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
          >
            {getUserInitials()}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to="/profile"
              className="text-sm font-medium truncate text-sidebar-foreground hover:text-sidebar-primary transition-colors block"
            >
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || 'User'}
            </Link>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {user?.role ? roleLabel(user.role) : 'User'}
            </p>
          </div>
          <div className="flex items-center">
            <Link
              to="/settings"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 p-1 transition-colors"
              title="Settings"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground/70 p-1 transition-colors"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
