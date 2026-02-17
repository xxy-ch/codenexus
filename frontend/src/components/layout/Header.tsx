import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 z-10">
      <div className="flex items-center flex-1">
        {title && (
          <h1 className="text-xl font-bold text-slate-800 dark:text-white mr-8 hidden md:block">
            {title}
          </h1>
        )}
        {showSearch && (
          <div className="relative w-full max-w-md hidden sm:block">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </span>
            <input
              type="text"
              placeholder="Search problems, users, or contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border-none bg-slate-100 dark:bg-slate-800 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
        </button>

        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

        {actions || (
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">add</span>
            <span className="hidden sm:inline">New Submission</span>
          </button>
        )}
      </div>
    </header>
  )
}