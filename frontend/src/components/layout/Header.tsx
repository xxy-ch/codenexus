import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SearchBar } from '@/components/search/SearchBar'

interface HeaderProps {
  title?: string
  showSearch?: boolean
  actions?: React.ReactNode
}

export function Header({ title, showSearch = true, actions }: HeaderProps) {
  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 z-10">
      <div className="flex items-center flex-1">
        {title && (
          <h1 className="text-xl font-bold text-slate-800 dark:text-white mr-8 hidden md:block">
            {title}
          </h1>
        )}
        {showSearch && (
          <div className="w-full max-w-md hidden sm:block">
            <SearchBar placeholder="Search problems, users, discussions..." />
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