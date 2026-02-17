import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ProblemFilters } from '@/services/problems'

const difficultyOptions = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const

const sortOptions = [
  { value: 'recent', label: 'Recent' },
  { value: 'popular', label: 'Popular' },
  { value: 'easy_first', label: 'Easy First' },
  { value: 'hard_first', label: 'Hard First' },
] as const

const popularTags = [
  'Array',
  'String',
  'Linked List',
  'Tree',
  'Graph',
  'Dynamic Programming',
  'Math',
  'Sorting',
  'Binary Search',
  'Greedy',
]

interface ProblemFiltersProps {
  filters: ProblemFilters
  onFiltersChange: (filters: ProblemFilters) => void
  totalCount?: number
}

export function ProblemFilters({
  filters,
  onFiltersChange,
  totalCount = 0,
}: ProblemFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '')
  const [showTagFilters, setShowTagFilters] = useState(false)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFiltersChange({ ...filters, search: searchValue, page: 1 })
  }

  const handleDifficultyChange = (difficulty: ProblemFilters['difficulty']) => {
    onFiltersChange({ ...filters, difficulty, page: 1 })
  }

  const handleSortChange = (sort: ProblemFilters['sort']) => {
    onFiltersChange({ ...filters, sort, page: 1 })
  }

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag]

    onFiltersChange({ ...filters, tags: newTags, page: 1 })
  }

  const handleClearFilters = () => {
    setSearchValue('')
    onFiltersChange({
      difficulty: 'all',
      sort: 'recent',
      search: '',
      tags: [],
      page: 1,
    })
  }

  const hasActiveFilters =
    filters.difficulty !== 'all' ||
    filters.search !== '' ||
    (filters.tags && filters.tags.length > 0)

  const currentTags = filters.tags || []

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <span className="material-symbols-outlined text-xl">search</span>
            </span>
            <input
              type="text"
              placeholder="Search problems..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-slate-800"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  onFiltersChange({ ...filters, search: '', page: 1 })
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </form>

        {/* Difficulty Filter */}
        <div className="flex gap-2">
          <select
            value={filters.difficulty || 'all'}
            onChange={(e) =>
              handleDifficultyChange(
                e.target.value as ProblemFilters['difficulty']
              )
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {difficultyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={filters.sort || 'recent'}
            onChange={(e) =>
              handleSortChange(e.target.value as ProblemFilters['sort'])
            }
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tag Filters */}
      <div>
        <button
          onClick={() => setShowTagFilters(!showTagFilters)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {showTagFilters ? 'expand_less' : 'expand_more'}
          </span>
          Filter by Tags
          {currentTags.length > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
              {currentTags.length}
            </span>
          )}
        </button>

        {showTagFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((tag) => {
              const isSelected = currentTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  )}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected Tags */}
        {currentTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {currentTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
              >
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary and Clear */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">{totalCount}</span> problems found
            {filters.difficulty !== 'all' && (
              <span className="ml-2">
                • {difficultyOptions.find((d) => d.value === filters.difficulty)?.label}
              </span>
            )}
            {currentTags.length > 0 && (
              <span className="ml-2">• {currentTags.length} tags</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-sm"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}