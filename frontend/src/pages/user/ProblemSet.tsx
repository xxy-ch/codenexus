import { useState } from 'react'
import { useProblems } from '@/hooks/useProblems'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { Loading } from '@/components/ui/Loading'
import { problemsService, type ProblemFilters } from '@/services/problems'
import { mockProblems } from '@/services/problems'

export function ProblemSet() {
  const [filters, setFilters] = useState<ProblemFilters>({
    difficulty: 'all',
    sort: 'recent',
    page: 1,
    limit: 50,
  })

  // 使用mock数据进行开发
  const [problems, setProblems] = useState(mockProblems)

  // TODO: 当后端API准备好时，启用这个查询
  // const { data, isLoading, error } = useProblems(filters)
  // const problems = data?.problems || []
  // const total = data?.total || 0

  const isLoading = false
  const error = null
  const total = problems.length

  const handleFiltersChange = (newFilters: ProblemFilters) => {
    setFilters(newFilters)

    // 客户端筛选 (仅用于开发)
    let filtered = [...mockProblems]

    if (newFilters.difficulty && newFilters.difficulty !== 'all') {
      filtered = filtered.filter((p) => p.difficulty === newFilters.difficulty)
    }

    if (newFilters.search) {
      const searchLower = newFilters.search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      )
    }

    if (newFilters.tags && newFilters.tags.length > 0) {
      filtered = filtered.filter((p) =>
        newFilters.tags!.some((tag) => p.tags.includes(tag))
      )
    }

    // 排序
    switch (newFilters.sort) {
      case 'easy_first':
        filtered.sort((a, b) => {
          const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        })
        break
      case 'hard_first':
        filtered.sort((a, b) => {
          const difficultyOrder = { easy: 0, medium: 1, hard: 2 }
          return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]
        })
        break
      case 'popular':
        filtered.sort((a, b) => b.points - a.points)
        break
      case 'recent':
      default:
        // 保持默认顺序
        break
    }

    setProblems(filtered)
  }

  if (isLoading) {
    return <Loading message="Loading problems..." />
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Failed to Load Problems
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Problem Set
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Practice coding problems and improve your skills
          </p>
        </div>
      </div>

      {/* Filters */}
      <ProblemFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        totalCount={total}
      />

      {/* Problems Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {problems.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              search_off
            </span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No Problems Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <ProblemTable problems={problems} showSolvedStatus={false} />
        )}
      </div>

      {/* Pagination */}
      {/* TODO: 当实现真实API时添加分页 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing <span className="font-medium">{problems.length}</span> of{' '}
          <span className="font-medium">{total}</span> problems
        </div>
      </div>
    </div>
  )
}