import { useState } from 'react'
import { useProblems } from '@/hooks/useProblems'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { Loading } from '@/components/ui/Loading'
import type { ProblemFilters as ProblemFiltersParams } from '@/services/problems'

export function ProblemSet() {
  const [filters, setFilters] = useState<ProblemFiltersParams>({
    difficulty: 'all',
    sort: 'recent',
    page: 1,
    limit: 20,
  })

  const { data, isLoading, error } = useProblems(filters)
  const problems = data?.problems || []
  const total = data?.total || 0
  const page = filters.page || 1
  const limit = filters.limit || 20
  const totalPages =
    data?.pages ||
    (total > 0 ? Math.ceil(total / limit) : 1)

  const handleFiltersChange = (newFilters: ProblemFiltersParams) => {
    setFilters(newFilters)
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing <span className="font-medium">{problems.length}</span> of{' '}
          <span className="font-medium">{total}</span> problems
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }))
            }
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
