import { Outlet } from 'react-router-dom'
import { MobileNavigation, Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="lg:ml-64">
        <TopBar />
        <MobileNavigation />
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
