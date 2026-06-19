import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Database,
  Edit,
  FileSearch,
  LayoutDashboard,
  School,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useFeatureEnabled } from '@/shared/hooks/useFeatureGate'
import { AmbientBackground } from '@/shared/layouts/AmbientBackground'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  group: Users,
  school: School,
  library_books: BookOpen,
  tune: SlidersHorizontal,
  dns: Database,
  edit_document: Edit,
  find_in_page: FileSearch,
  settings: Settings,
}

export function AdminLayout() {
  const location = useLocation()
  const { enabled: plagiarismEnabled } = useFeatureEnabled('plagiarism')

  const navigation = [
    { name: '仪表板', href: '/admin', icon: 'dashboard' },
    { name: '用户管理', href: '/admin/users', icon: 'group' },
    { name: '年级管理', href: '/admin/grades', icon: 'school' },
    { name: '题目管理', href: '/admin/problems', icon: 'library_books' },
    { name: '判题设置', href: '/admin/judge-settings', icon: 'tune' },
    { name: '判题队列', href: '/admin/judge-queue', icon: 'dns' },
    { name: '功能管理', href: '/admin/features', icon: 'settings' },
    { name: '题面配置', href: '/admin/problem-content', icon: 'edit_document' },
    ...(plagiarismEnabled
      ? [
          { name: '相似度配置', href: '/admin/similarity-scan', icon: 'tune' },
          { name: '抄袭报告', href: '/admin/plagiarism-reports', icon: 'find_in_page' },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen relative z-0 flex flex-col text-foreground bg-background">
      <AmbientBackground />
      {/* Admin Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
                <span className="flex h-8 w-11 items-center justify-center">
                  <img src="/codenexus-mark.svg" alt="" aria-hidden="true" className="h-7 w-11" />
                </span>
                <span className="text-[17px] font-normal font-english">CodeNexus</span>
              </Link>
              <nav className="hidden md:flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex h-9 items-center gap-1.5 px-3 text-[13px] font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <IconComponent className="h-4 w-4" strokeWidth={2} />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="border border-transparent px-2 py-1 text-[14px] text-muted-foreground hover:border-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors"
              >
                返回用户界面
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-0">
        <Outlet />
      </main>
    </div>
  )
}
