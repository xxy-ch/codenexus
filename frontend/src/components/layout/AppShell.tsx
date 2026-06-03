import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Code2,
  Database,
  FileSearch,
  LayoutDashboard,
  School,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { MobileNavigation, Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '../../store/authStore'

const adminNavigation = [
  { label: '仪表板', href: '/admin', icon: LayoutDashboard },
  { label: '用户管理', href: '/admin/users', icon: Users },
  { label: '年级管理', href: '/admin/grades', icon: School },
  { label: '题目管理', href: '/admin/problems', icon: BookOpen },
  { label: '判题设置', href: '/admin/judge-settings', icon: SlidersHorizontal },
  { label: '判题队列', href: '/admin/judge-queue', icon: Database },
  { label: '题面配置', href: '/admin/problem-content', icon: Settings },
  { label: '相似度配置', href: '/admin/similarity-scan', icon: SlidersHorizontal },
  { label: '抄袭报告', href: '/admin/plagiarism-reports', icon: FileSearch },
]

export function AppShell() {
  const location = useLocation()
  const { user } = useAuthStore()
  const isAdminArea = location.pathname.startsWith('/admin') && (user?.role === 'admin' || user?.role === 'root')

  if (isAdminArea) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest/90 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-6">
              <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="font-display text-lg font-bold">CodeNexus</span>
              </Link>
              <nav className="hidden min-w-0 gap-1 overflow-x-auto md:flex">
                {adminNavigation.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors ${
                        active
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <Link to="/dashboard" className="shrink-0 text-sm font-medium text-on-surface-variant hover:text-primary">
              返回用户界面
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="lg:ml-60">
        <TopBar />
        <MobileNavigation />
        <main className="p-4 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
