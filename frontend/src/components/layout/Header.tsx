import { SearchBar } from '@/components/search/SearchBar'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:px-8">
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
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-200 hover:border-blue-200 hover:bg-blue-50/80 hover:text-blue-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <span className="material-symbols-outlined" aria-hidden="true">notifications</span>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
        </button>

        {actions || (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-800 bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(30,64,175,0.18)] transition-all duration-200 hover:border-blue-700 hover:bg-blue-700 dark:border-blue-300 dark:bg-blue-300 dark:text-slate-900 dark:hover:bg-blue-200"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
            <span className="hidden sm:inline">New Submission</span>
          </button>
        )}
      </div>
    </header>
  )
}
