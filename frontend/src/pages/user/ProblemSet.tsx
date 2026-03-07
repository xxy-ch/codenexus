import { useState } from 'react'
import { useProblems } from '@/hooks/useProblems'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { Loading } from '@/components/ui/Loading'
import { Link } from 'react-router-dom'
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

  const visibleProblems = problems.length
  const easyCount = problems.filter((problem) => problem.difficulty === 'easy').length
  const mediumHardCount = problems.filter((problem) => problem.difficulty !== 'easy').length
  const tagCount = new Set(problems.flatMap((problem) => problem.tags)).size

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
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Problem Repository
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Problem Repository
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Browse the active problem catalog, refine by difficulty and topic, and jump back into solving with less friction.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/submissions"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <span className="material-symbols-outlined text-base">history</span>
            Submission History
          </Link>
          <Link
            to="/contests"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-hover"
          >
            <span className="material-symbols-outlined text-base">emoji_events</span>
            Explore Contests
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Available
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{total}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined">database</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Current searchable catalog size.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Visible
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{visibleProblems}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="material-symbols-outlined">filter_alt</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Problems shown under the current filter set.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Easy Pool
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{easyCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Easy problems in the current result set.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Topics
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{tagCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <span className="material-symbols-outlined">sell</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Distinct tags across the current result set.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:p-5 lg:sticky lg:top-20 lg:z-10">
        <ProblemFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={total}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Repository Results
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {visibleProblems} visible, {mediumHardCount} medium or hard problems in the current view.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span className="material-symbols-outlined text-sm">tune</span>
            Sort: {filters.sort || 'recent'}
          </div>
        </div>

        {problems.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="material-symbols-outlined mb-4 text-6xl text-slate-300 dark:text-slate-600">
              search_off
            </span>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No Problems Found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <ProblemTable problems={problems} showSolvedStatus={false} />
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-900 dark:text-white">{visibleProblems}</span> of{' '}
          <span className="font-semibold text-slate-900 dark:text-white">{total}</span> problems
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
          <span className="min-w-20 text-center text-sm text-slate-600 dark:text-slate-400">
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
      </section>
    </div>
  )
}
