import {
  BarChart3,
  ClipboardList,
  Code2,
  History,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  TerminalSquare,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { getNavigationItemsForUser } from '@/router/registry'
import { useAuthStore } from '../../store/authStore'

const iconComponents = {
  assessment: ClipboardList,
  code: Code2,
  dashboard: LayoutDashboard,
  forum: MessageSquare,
  groups: Users,
  history: History,
  leaderboard: BarChart3,
  manage_accounts: UserCog,
  search: Search,
  settings: Settings,
  terminal: TerminalSquare,
  trophy: Trophy,
}

export function Sidebar() {
  const location = useLocation()
  const { user } = useAuthStore()
  const navItems = getNavigationItemsForUser(user?.role)
  const workspaceItems = navItems.filter((item) => !item.roles)
  const privilegedItems = navItems.filter((item) => item.roles)
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-surface-container border-r border-outline-variant lg:block">
      <div className="flex h-16 items-center border-b border-outline-variant px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <span className="text-white font-bold text-sm">OJ</span>
          </div>
          <span className="font-display font-bold text-lg text-on-surface">Online Judge</span>
        </Link>
      </div>

      <nav className="mt-4 px-3">
        <ul className="space-y-1">
          {workspaceItems.map((item) => (
            <SidebarItem key={item.path} item={item} active={isActive(item.path)} />
          ))}
        </ul>
      </nav>

      {privilegedItems.length > 0 && (
        <div className="mt-6 px-3">
          <p className="px-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Role Tools</p>
          <ul className="mt-2 space-y-1">
            {privilegedItems.map((item) => <SidebarItem key={item.path} item={item} active={isActive(item.path)} />)}
          </ul>
        </div>
      )}
    </aside>
  )
}

function SidebarItem({
  item,
  active,
}: {
  item: { icon: string; label: string; path: string }
  active: boolean
}) {
  const Icon = iconComponents[item.icon as keyof typeof iconComponents] ?? Search

  return (
    <li>
      <Link
        to={item.path}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{item.label}</span>
      </Link>
    </li>
  )
}

export function MobileNavigation() {
  const location = useLocation()
  const { user } = useAuthStore()
  const navItems = getNavigationItemsForUser(user?.role)
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <nav className="sticky top-16 z-20 border-b border-outline-variant bg-surface-container/95 px-3 py-2 backdrop-blur-sm lg:hidden">
      <div className="flex gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <MobileNavigationItem key={item.id} item={item} active={isActive(item.path)} />
        ))}
      </div>
    </nav>
  )
}

function MobileNavigationItem({
  item,
  active,
}: {
  item: { icon: string; label: string; path: string }
  active: boolean
}) {
  const Icon = iconComponents[item.icon as keyof typeof iconComponents] ?? Search

  return (
    <Link
      to={item.path}
      className={`flex min-w-20 shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary-container text-on-primary-container'
          : 'text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="max-w-24 truncate">{item.label}</span>
    </Link>
  )
}
