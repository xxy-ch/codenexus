import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { FEATURE_FLAGS } from '@/services/config'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
}

interface SidebarProps {
  mode?: 'workspace' | 'admin'
}

const DESKTOP_COLLAPSE_BREAKPOINT = 1100
const MOBILE_LAYOUT_BREAKPOINT = 768
const STORAGE_KEY = 'sidebar-collapsed'
const COLLAPSED_SHELL_WIDTH = '96px'
const EXPANDED_SHELL_WIDTH = '288px'

const workspaceNavItems: NavItem[] = [
  { label: '首页', path: '/dashboard', icon: 'dashboard' },
  { label: '题库', path: '/problems', icon: 'code' },
  { label: '提交', path: '/submissions', icon: 'history' },
  { label: '竞赛', path: '/contests', icon: 'emoji_events' },
  { label: '排行', path: '/ranking', icon: 'leaderboard' },
  { label: '路线图', path: '/roadmap', icon: 'route' },
  { label: '讨论', path: '/discussions', icon: 'forum' },
  { label: '博客', path: '/blog', icon: 'article' },
  ...(FEATURE_FLAGS.directMessages ? [{ label: '消息', path: '/messages', icon: 'mail' }] : []),
  { label: '班级', path: '/teacher/classes', icon: 'group' },
  { label: '竞赛编排', path: '/teacher/contest-wizard', icon: 'build' },
  { label: '报告', path: '/teacher/assignment-report', icon: 'insights' },
]

const adminNavItems: NavItem[] = [
  { label: '总览', path: '/admin', icon: 'dashboard' },
  { label: '用户', path: '/admin/users', icon: 'group' },
  { label: '题目管理', path: '/admin/problems', icon: 'library_books' },
  { label: '判题设置', path: '/admin/judge-settings', icon: 'tune' },
  { label: '题面配置', path: '/admin/problem-content', icon: 'edit_document' },
  ...(FEATURE_FLAGS.plagiarism
    ? [
        { label: '相似度扫描', path: '/admin/similarity-scan', icon: 'monitoring' },
        { label: '查重报告', path: '/admin/plagiarism-reports', icon: 'find_in_page' },
      ]
    : []),
]

function getInitialCollapsedState() {
  if (typeof window === 'undefined') {
    return false
  }

  const persisted = window.localStorage.getItem(STORAGE_KEY)
  if (persisted !== null) {
    return persisted === 'true'
  }

  return window.innerWidth < DESKTOP_COLLAPSE_BREAKPOINT
}

function getSidebarShellWidth(collapsed: boolean) {
  if (typeof window === 'undefined') {
    return COLLAPSED_SHELL_WIDTH
  }

  if (window.innerWidth < MOBILE_LAYOUT_BREAKPOINT) {
    return '0px'
  }

  return collapsed ? COLLAPSED_SHELL_WIDTH : EXPANDED_SHELL_WIDTH
}

export function Sidebar({ mode = 'workspace' }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(getInitialCollapsedState)
  const [hasManualPreference, setHasManualPreference] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(STORAGE_KEY) !== null
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const applyState = (nextCollapsed: boolean) => {
      setCollapsed(nextCollapsed)
      document.documentElement.dataset.sidebarCollapsed = nextCollapsed ? 'true' : 'false'
      document.documentElement.style.setProperty('--sidebar-shell-width', getSidebarShellWidth(nextCollapsed))
    }

    applyState(getInitialCollapsedState())

    const onResize = () => {
      if (hasManualPreference) {
        return
      }
      applyState(window.innerWidth < DESKTOP_COLLAPSE_BREAKPOINT)
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [hasManualPreference])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    document.documentElement.dataset.sidebarCollapsed = collapsed ? 'true' : 'false'
    document.documentElement.style.setProperty('--sidebar-shell-width', getSidebarShellWidth(collapsed))
  }, [collapsed])

  const handleToggle = () => {
    const next = !collapsed
    setCollapsed(next)
    setHasManualPreference(true)
    window.localStorage.setItem(STORAGE_KEY, String(next))
  }

  const handleLogout = async () => {
    await logout()
  }

  const displayName = useMemo(
    () => user?.display_name || user?.username || '平台用户',
    [user],
  )

  const roleLabel = useMemo(() => {
    if (user?.role === 'admin') return '管理员'
    if (user?.role === 'teacher') return '教师'
    return '学生'
  }, [user])

  const navItems = useMemo(() => {
    if (mode === 'admin') {
      return adminNavItems
    }

    const canAccessTeacher = user?.role === 'teacher' || user?.role === 'admin'
    if (canAccessTeacher) {
      return workspaceNavItems
    }

    return workspaceNavItems.filter((item) => !item.path.startsWith('/teacher/'))
  }, [mode, user?.role])
  const isAdminMode = mode === 'admin'
  const homePath = isAdminMode ? '/admin' : '/dashboard'
  const brandIcon = isAdminMode ? 'shield' : 'code'
  const brandTitle = isAdminMode ? '管理中心' : '建筑算法学社'
  const brandSubtitle = isAdminMode ? '运营与审核' : '学习工作台'

  return (
    <aside
      aria-label="Global sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col bg-[rgb(var(--sidebar-bg-rgb))] px-3 py-4 text-[rgb(var(--foreground-rgb))] shadow-[20px_0_60px_rgba(0,22,74,0.06)] backdrop-blur-xl md:flex',
        collapsed ? 'w-[96px]' : 'w-[288px]',
      )}
    >
      <div className="mb-6 flex items-center justify-between gap-3 px-2">
        <Link
          to={homePath}
          aria-label={isAdminMode ? '管理中心首页' : '学习工作台首页'}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-[18px] px-2 py-2.5 transition-colors hover:bg-white/60',
            collapsed && 'justify-center px-0',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] text-white shadow-[0_14px_28px_rgba(0,61,155,0.22)]">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">{brandIcon}</span>
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block truncate font-['Manrope'] text-[1.15rem] font-extrabold leading-none tracking-[-0.04em] text-[#17305e]">
                {brandTitle}
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6b7ca7]">
                {brandSubtitle}
              </span>
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          onClick={handleToggle}
          className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-white/70 text-[#5c6f95] transition-colors hover:bg-white hover:text-[#17305e]"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            {collapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>

      <nav className="flex-1 space-y-1" aria-label={isAdminMode ? '管理导航' : '主导航'}>
        {navItems.map((item) => {
          const isActive = item.path === '/dashboard'
            ? location.pathname === '/' || location.pathname.startsWith('/dashboard')
            : item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group flex min-h-[52px] items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-semibold transition-all duration-200',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-white text-[#184094] shadow-[0_10px_28px_rgba(0,61,155,0.08)]'
                  : 'text-[#586988] hover:bg-white/65 hover:text-[#17305e]',
              )}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
                {item.icon}
              </span>
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
              {!collapsed && item.badge ? (
                <span className="ml-auto rounded-full bg-[#dae2ff] px-2 py-0.5 text-[11px] font-bold text-[#003d9b]">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 space-y-3">
        <Link
          to={isAdminMode ? '/dashboard' : '/problems'}
          aria-label={isAdminMode ? '返回用户工作台' : '进入题目列表'}
          title={collapsed ? (isAdminMode ? '返回用户工作台' : '进入题目列表') : undefined}
          className={cn(
            'flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-3 font-semibold text-white shadow-[0_16px_32px_rgba(0,61,155,0.18)] transition-transform duration-200 hover:-translate-y-px',
            collapsed && 'mx-auto h-[52px] w-[52px] px-0 py-0',
          )}
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            {isAdminMode ? 'arrow_back' : 'terminal'}
          </span>
          {!collapsed ? <span>{isAdminMode ? '返回用户工作台' : '进入题目列表'}</span> : null}
        </Link>

        <div className={cn(
          'rounded-[18px] bg-white/72 px-4 py-4 text-sm text-[#4c5d7d] shadow-[0_10px_26px_rgba(19,27,46,0.05)]',
          collapsed && 'px-2 py-3',
        )}>
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dae2ff] font-semibold text-[#003d9b]">
              {(displayName[0] || 'U').toUpperCase()}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <Link to="/profile" className="block truncate font-semibold text-[#17305e]">
                  {displayName}
                </Link>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#6b7ca7]">
                  {isAdminMode ? '管理后台' : roleLabel}
                </p>
              </div>
            ) : null}
          </div>

          <div className={cn('mt-3 grid gap-1', collapsed && 'mt-2')}>
            <Link
              to="/settings"
              aria-label="设置"
              title={collapsed ? '设置' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-[14px] px-3 py-2.5 font-medium transition-colors hover:bg-[#eef2ff] hover:text-[#17305e]',
                collapsed && 'justify-center px-0',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">settings</span>
              {!collapsed ? <span>设置</span> : null}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="退出登录"
              title={collapsed ? '退出登录' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-[14px] px-3 py-2.5 font-medium text-left transition-colors hover:bg-[#eef2ff] hover:text-[#17305e]',
                collapsed && 'justify-center px-0',
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
              {!collapsed ? <span>退出登录</span> : null}
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
