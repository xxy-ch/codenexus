import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Code2,
  Database,
  Edit,
  FileSearch,
  LayoutDashboard,
  School,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeatureEnabled } from '@/hooks/useFeatureGate'

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
    { name: '题面配置', href: '/admin/problem-content', icon: 'edit_document' },
    ...(plagiarismEnabled
      ? [
          { name: '相似度配置', href: '/admin/similarity-scan', icon: 'tune' },
          { name: '抄袭报告', href: '/admin/plagiarism-reports', icon: 'find_in_page' },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-muted">
      {/* Admin Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <Code2 className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">CodeNexus</span>
              </Link>
              <nav className="hidden md:flex gap-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  const IconComponent = ICON_MAP[item.icon] ?? LayoutDashboard
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-secondary'
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                返回用户界面
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
