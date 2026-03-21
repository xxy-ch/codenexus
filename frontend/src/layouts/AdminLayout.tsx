import { Outlet, Link } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg-rgb))] text-[rgb(var(--foreground-rgb))]">
      <Sidebar mode="admin" />
      <main className="min-h-screen transition-[padding] duration-200 md:pl-[88px] md:[html[data-sidebar-collapsed='false']_&]:pl-[272px]">
        <header className="sticky top-0 z-20 bg-[rgba(250,248,255,0.82)] px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7a89a7]">Admin workspace</div>
              <div className="font-['Manrope'] text-xl font-extrabold tracking-[-0.03em] text-[#17305e]">Operations and moderation</div>
            </div>
            <Link
              to="/dashboard"
              aria-label="Return to user workspace"
              className="inline-flex items-center gap-2 rounded-[16px] bg-white px-4 py-2.5 text-sm font-semibold text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.05)] transition-colors hover:bg-[#eef2ff]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
              <span className="hidden sm:inline">Return to user workspace</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 px-4 py-4 md:px-8 md:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
