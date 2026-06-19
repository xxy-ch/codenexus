import { SearchBar } from '@/features/search/components/SearchBar'
import { Bell, Plus } from 'lucide-react'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 sm:px-5 z-10 shrink-0">
      <div className="flex items-center flex-1 gap-6">
        {title && (
          <h1 className="text-sm font-semibold text-foreground hidden md:block shrink-0">
            {title}
          </h1>
        )}
        {showSearch && (
          <div className="w-full max-w-md hidden sm:block">
            <SearchBar placeholder="搜索题目和讨论..." />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="relative border border-transparent p-2 text-muted-foreground hover:border-accent/50 hover:bg-accent-wash hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors duration-150"
          aria-label="通知"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive ring-2 ring-card" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {actions || (
          <button className="border border-accent/45 bg-accent-wash px-3.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-accent hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-colors flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新建提交</span>
          </button>
        )}
      </div>
    </header>
  )
}
