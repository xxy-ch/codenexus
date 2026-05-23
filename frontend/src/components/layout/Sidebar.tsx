import { useState } from 'react'
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
  ChevronLeft,
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true'
  })

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      return next
    })
  }

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
    <aside
      className={cn(
        'bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border flex-shrink-0 flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-10',
        isCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo area */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border flex-shrink-0 overflow-hidden">
        <div className="flex items-center">
          <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
            <Code2 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="ml-2.5 text-sm font-semibold tracking-tight text-sidebar-foreground font-serif">
              CodeNexus
            </span>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="p-1 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
            title="收起侧边栏"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCollapsed && (
        <div className="h-10 flex items-center justify-center flex-shrink-0">
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200"
            title="展开侧边栏"
          >
            <Code2 className="w-4 h-4 text-primary" />
          </button>
        </div>
      )}

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
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-md text-sm transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
                  isCollapsed ? 'justify-center py-2 mx-1' : 'gap-2.5 px-2.5 py-1.5',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold border-l-2 border-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                {!isCollapsed && item.badge && (
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
      <div className="p-3 border-t border-sidebar-border flex-shrink-0">
        <div className={cn('flex items-center gap-2.5', isCollapsed && 'flex-col gap-3')}>
          <Link
            to="/profile"
            className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold hover:bg-primary/20 transition-all duration-200 flex-shrink-0"
            title={isCollapsed ? '个人中心' : undefined}
          >
            {getUserInitials()}
          </Link>
          {!isCollapsed ? (
            <>
              <div className="flex-1 min-w-0">
                <Link
                  to="/profile"
                  className="text-sm font-medium truncate text-sidebar-foreground hover:text-sidebar-primary transition-colors duration-200 block"
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
                  className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1 rounded-md hover:bg-sidebar-accent transition-all duration-200"
                  title="设置"
                >
                  <UserCog className="w-[18px] h-[18px]" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1 rounded-md hover:bg-sidebar-accent transition-all duration-200"
                  title="退出登录"
                >
                  <LogOut className="w-[18px] h-[18px]" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/settings"
                className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent transition-all duration-200"
                title="设置"
              >
                <UserCog className="w-[16px] h-[16px]" />
              </Link>
              <button
                onClick={handleLogout}
                className="text-sidebar-foreground/40 hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent transition-all duration-200"
                title="退出登录"
              >
                <LogOut className="w-[16px] h-[16px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
