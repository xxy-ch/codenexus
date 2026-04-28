import { SearchBar } from '@/components/search/SearchBar'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="h-12 bg-card border-b border-border flex items-center justify-between px-6 z-10">
      <div className="flex items-center flex-1">
        {title && (
          <h1 className="text-sm font-semibold text-foreground mr-8 hidden md:block">
            {title}
          </h1>
        )}
        {showSearch && (
          <div className="w-full max-w-md hidden sm:block">
            <SearchBar placeholder="Search problems and discussions..." />
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <button className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-destructive rounded-full" />
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {actions || (
          <button className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">add</span>
            <span className="hidden sm:inline">New Submission</span>
          </button>
        )}
      </div>
    </header>
  )
}
