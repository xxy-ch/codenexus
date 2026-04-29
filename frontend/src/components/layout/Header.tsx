import { SearchBar } from '@/components/search/SearchBar'
import { Bell, Plus } from 'lucide-react'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="h-12 bg-white border-b border-border flex items-center justify-between px-6 z-10">
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
          className="relative p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors duration-150"
          aria-label="通知"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full ring-2 ring-card" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {actions || (
          <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors duration-150 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">新建提交</span>
          </button>
        )}
      </div>
    </header>
  )
}
