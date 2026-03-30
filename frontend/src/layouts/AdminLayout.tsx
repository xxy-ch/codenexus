import { Outlet, Link } from 'react-router-dom'
import { MobileNav } from '@/components/layout/MobileNav'
import { Sidebar } from '@/components/layout/Sidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg-rgb))] text-[rgb(var(--foreground-rgb))]">
      {/* SideNavBar - fixed, full height, z-50 */}
      <Sidebar mode="admin" />

      {/* Main content area with left margin */}
      <main className="ml-64 min-h-screen flex flex-col">
        {/* TopAppBar - sticky, z-40, full width */}
        <header className="sticky top-0 z-40 w-full bg-[rgba(250,248,255,0.82)] backdrop-blur-xl">
          <div className="flex items-center justify-between px-8 py-3 w-full max-w-[1440px] mx-auto">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7a89a7]">管理台</div>
              <div className="font-['Manrope'] text-xl font-extrabold tracking-[-0.03em] text-[#17305e]">运营与审核中心</div>
            </div>
            <Link
              to="/dashboard"
              aria-label="返回用户工作台"
              className="inline-flex items-center gap-2 rounded-[16px] bg-white px-4 py-2.5 text-sm font-semibold text-[#17305e] shadow-[0_10px_24px_rgba(19,27,46,0.05)] transition-colors hover:bg-[#eef2ff]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
              <span className="hidden sm:inline">返回用户工作台</span>
            </Link>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1">
          <div className="px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
            <Outlet />
          </div>
          <MobileNav mode="admin" />
        </div>
      </main>
    </div>
  )
}
