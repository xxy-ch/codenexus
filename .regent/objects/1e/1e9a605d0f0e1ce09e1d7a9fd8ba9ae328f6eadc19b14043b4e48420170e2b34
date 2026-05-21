import { useState } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ProblemFilters } from '@/services/problems'

const difficultyOptions = [
  { value: 'all', label: '全部难度' },
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
] as const

const sortOptions = [
  { value: 'recent', label: '最新' },
  { value: 'popular', label: '热门' },
  { value: 'easy_first', label: '从简单到困难' },
  { value: 'hard_first', label: '从困难到简单' },
] as const

const popularTags = [
  '数组',
  '字符串',
  '链表',
  '树',
  '图',
  '动态规划',
  '数学',
  '排序',
  '二分查找',
  '贪心',
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
      {/* Search and filters — Vercel clean */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute inset-y-0 left-0 pl-3 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索题目..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('')
                  onFiltersChange({ ...filters, search: '', page: 1 })
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>

        {/* Difficulty filter */}
        <div className="flex gap-2">
          <select
            value={filters.difficulty || 'all'}
            onChange={(e) =>
              handleDifficultyChange(
                e.target.value as ProblemFilters['difficulty']
              )
            }
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tag filters */}
      <div>
        <button
          onClick={() => setShowTagFilters(!showTagFilters)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTagFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          按标签筛选
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
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        )}

        {/* Selected tags */}
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
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Active filter summary and clear */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{totalCount}</span> 道题目
            {filters.difficulty !== 'all' && (
              <span className="ml-2">
                • {difficultyOptions.find((d) => d.value === filters.difficulty)?.label}
              </span>
            )}
            {currentTags.length > 0 && (
              <span className="ml-2">• {currentTags.length} 个标签</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-sm"
          >
            清除筛选
          </Button>
        </div>
      )}
    </div>
  )
}
