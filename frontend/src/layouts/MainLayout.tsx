import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[rgb(var(--page-bg-rgb))] text-slate-900 antialiased dark:text-slate-100">
      <Sidebar />
      <main
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ width: 'calc(100% - var(--sidebar-shell-width, 16rem))' }}
      >
        <Header />
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-6 md:py-6 lg:px-8 lg:pb-6">
          <Outlet />
        </div>
        <MobileNav />
      </main>
    </div>
  )
}
