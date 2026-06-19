import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Terminal, Trophy, MessageSquare, User } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: '首页', path: '/dashboard', icon: LayoutDashboard },
  { label: '题库', path: '/problems', icon: Terminal },
  { label: '竞赛', path: '/contests', icon: Trophy },
  { label: '讨论', path: '/discussions', icon: MessageSquare },
  { label: '我的', path: '/profile', icon: User },
]

export function MobileNav() {
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-1 px-3 py-2 transition-colors duration-150 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                isActive
                  ? 'bg-accent-wash text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 transition-colors duration-200',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )} strokeWidth={2} />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
