import { SearchBar } from '@/components/search/SearchBar'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 lg:px-8">
      <div className="flex flex-1 items-center gap-6">
        {title && (
          <h1 className="hidden text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 md:block">
            {title}
          </h1>
        )}
        {showSearch && (
          <div className="hidden w-full max-w-md sm:block">
            <SearchBar placeholder="Search problems and discussions..." />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {actions || (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
            <span className="hidden sm:inline">New Submission</span>
          </button>
        )}
      </div>
    </header>
  )
}
