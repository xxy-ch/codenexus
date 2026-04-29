import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Terminal, Trophy, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#f6f9fc] border-t border-border z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1',
                isActive
                  ? 'text-primary bg-white shadow-[0_1px_2px_rgba(50,50,93,0.08),0_0_0.5px_rgba(0,0,0,0.06)]'
                  : 'text-muted-foreground hover:bg-white hover:text-foreground hover:shadow-[0_1px_2px_rgba(50,50,93,0.08),0_0_0.5px_rgba(0,0,0,0.06)]'
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <Icon className={cn(
                'w-5 h-5 transition-colors duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              <span className="text-xs font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
