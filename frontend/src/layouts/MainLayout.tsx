import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg-rgb))] text-[rgb(var(--foreground-rgb))] selection:bg-[rgba(213,227,252,0.85)]">
      {/* SideNavBar - fixed, full height, z-50 */}
      <Sidebar />

      {/* Main content area with left margin */}
      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar - sticky, z-40, full width */}
        <Header />

        {/* Content area */}
        <div className="flex-1">
          <div className="pb-24 md:pb-0">
            <Outlet />
          </div>
          <MobileNav />
        </div>
      </main>
    </div>
  )
}
