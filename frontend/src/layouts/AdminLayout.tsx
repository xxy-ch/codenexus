import { Outlet, Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const location = useLocation()

  const navigation = [
    { name: '仪表板', href: '/admin', icon: 'dashboard' },
    { name: '用户管理', href: '/admin/users', icon: 'people' },
    { name: '题目管理', href: '/admin/problems', icon: 'library_books' },
    { name: '举报管理', href: '/admin/reports', icon: 'flag' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Admin Header */}
      <header className="bg-white dark:bg-slate-900 border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-primary">code</span>
                <span className="font-bold text-lg">Online Judge</span>
              </Link>
              <nav className="hidden md:flex gap-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                      )}
                    >
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-sm text-slate-600 hover:text-primary dark:text-slate-400"
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
