import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export function MainLayout() {
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg-rgb))] text-[rgb(var(--foreground-rgb))] selection:bg-[rgba(213,227,252,0.85)]">
      <Sidebar />
      <main className="min-h-screen transition-[padding] duration-200 md:pl-[88px] md:[html[data-sidebar-collapsed='false']_&]:pl-[272px]">
        <Header />
        <div className="pb-24 md:pb-0">
          <Outlet />
        </div>
        <MobileNav />
      </main>
    </div>
  )
}
