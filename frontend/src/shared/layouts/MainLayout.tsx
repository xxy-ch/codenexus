import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/shared/layouts/Sidebar'
import { Header } from '@/shared/layouts/Header'
import { PageTransition } from '@/shared/layouts/PageTransition'
import { AmbientBackground } from '@/shared/layouts/AmbientBackground'
import { MobileNav } from '@/shared/layouts/MobileNav'

export function MainLayout() {
  const location = useLocation()
  const isIdeView = location.pathname.endsWith('/solve')

  if (isIdeView) {
    return (
      <div className="bg-background text-foreground antialiased h-screen flex overflow-hidden">
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-hidden p-0">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground antialiased h-screen flex overflow-hidden relative">
      <AmbientBackground />
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <Header />
        <div className="flex-1 min-w-0 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 relative z-0">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
