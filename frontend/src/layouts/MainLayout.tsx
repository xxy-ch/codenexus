import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { PageTransition } from '@/components/layout/PageTransition'
import { AmbientBackground } from '@/components/layout/AmbientBackground'

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
        <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-0">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
