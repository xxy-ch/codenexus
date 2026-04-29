import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { useFeatureEnabled } from '@/hooks/useFeatureGate'
import { isAdmin, isTeacherOrAbove, roleLabel, type Role } from '@/types/auth'
import {
  Code2,
  LayoutDashboard,
  Terminal,
  History,
  Trophy,
  BarChart3,
  Map,
  MessageSquare,
  BookOpen,
  Mail,
  Users,
  Wand2,
  FileBarChart,
  Upload,
  Cog,
  LogOut,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  badge?: number
  minRole?: 'teacher' | 'admin'
}

function canSeeItem(minRole: NavItem['minRole'], userRole: Role): boolean {
  if (!minRole) return true
  if (minRole === 'admin') return isAdmin(userRole)
  if (minRole === 'teacher') return isTeacherOrAbove(userRole)
  return true
}

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { enabled: dmEnabled } = useFeatureEnabled('direct_messages')

  const navItems: NavItem[] = [
    { label: '仪表板', path: '/dashboard', icon: LayoutDashboard },
    { label: '题库', path: '/problems', icon: Terminal },
    { label: '提交记录', path: '/submissions', icon: History },
    { label: '竞赛', path: '/contests', icon: Trophy, badge: 2 },
    { label: '排行榜', path: '/ranking', icon: BarChart3 },
    { label: '学习路线', path: '/roadmap', icon: Map },
    { label: '讨论区', path: '/discussions', icon: MessageSquare },
    { label: '博客', path: '/blog', icon: BookOpen },
    ...(dmEnabled ? [{ label: '消息', path: '/messages', icon: Mail }] : []),
    { label: '班级管理', path: '/teacher/classes', icon: Users, minRole: 'teacher' },
    { label: '创建竞赛', path: '/teacher/contest-wizard', icon: Wand2, minRole: 'teacher' },
    { label: '作业报告', path: '/teacher/assignment-report', icon: FileBarChart, minRole: 'teacher' },
    { label: '批量操作', path: '/batch-operations', icon: Upload, minRole: 'teacher' },
    { label: '功能管理', path: '/admin/features', icon: Cog, minRole: 'admin' },
  ]

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
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex flex-col h-full">
      {/* Logo area */}
      <div className="h-12 flex items-center px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center shadow-sm">
          <Code2 className="w-4 h-4 text-primary-foreground" />
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
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-r-md text-sm transition-all duration-200',
                  isActive
                    ? 'bg-white text-sidebar-accent-foreground font-medium border-l-2 border-primary shadow-[0_1px_2px_rgba(50,50,93,0.08),0_0_0.5px_rgba(0,0,0,0.06)]'
                    : 'text-sidebar-foreground/70 hover:bg-white hover:text-sidebar-foreground hover:shadow-[0_1px_2px_rgba(50,50,93,0.08),0_0_0.5px_rgba(0,0,0,0.06)]'
                )}
                style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <Icon className={cn(
                  'w-[18px] h-[18px] transition-colors duration-200',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className="truncate">{item.label}</span>
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

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold hover:bg-primary/20 transition-all duration-200"
            style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {getUserInitials()}
          </Link>
          <div className="flex-1 min-w-0">
            <Link
              to="/profile"
              className="text-sm font-medium truncate text-sidebar-foreground hover:text-sidebar-primary transition-colors duration-200 block"
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.username || '用户'}
            </Link>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {user?.role ? roleLabel(user.role) : '用户'}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Link
              to="/settings"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1 rounded-md hover:bg-white transition-all duration-200"
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
              title="设置"
            >
              <UserCog className="w-[18px] h-[18px]" />
            </Link>
            <button
              onClick={handleLogout}
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1 rounded-md hover:bg-white transition-all duration-200"
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
              title="退出登录"
            >
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
