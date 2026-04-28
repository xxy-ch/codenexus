import { useState } from 'react'
import { useProblems } from '@/hooks/useProblems'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderOpen } from 'lucide-react'
import { ProblemListSkeleton } from '@/components/skeletons/ProblemListSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
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
  const easyCount = problems.filter((p) => p.difficulty === 'easy').length
  const mediumCount = problems.filter((p) => p.difficulty === 'medium').length
  const hardCount = problems.filter((p) => p.difficulty === 'hard').length

  const handleFiltersChange = (newFilters: ProblemFiltersParams) => {
    setFilters(newFilters)
  }

  if (isLoading) {
    return <ProblemListSkeleton />
  }

  if (error) {
    return <InlineError title="题目加载失败" message="无法加载题目列表，请稍后重试" />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Problem Repository
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Problems
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            Browse the problem catalog. Filter by difficulty and topic, then start solving.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/submissions">
              <span className="material-symbols-outlined text-base mr-1.5">history</span>
              Submissions
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/contests">
              <span className="material-symbols-outlined text-base mr-1.5">emoji_events</span>
              Contests
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total}</p>
          </CardContent>
        </Card>

        <Card className="border-difficulty-easy/20">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-difficulty-easy">
              Easy
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{easyCount}</p>
          </CardContent>
        </Card>

        <Card className="border-difficulty-medium/20">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-difficulty-medium">
              Medium
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{mediumCount}</p>
          </CardContent>
        </Card>

        <Card className="border-difficulty-hard/20">
          <CardContent className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-difficulty-hard">
              Hard
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{hardCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="lg:sticky lg:top-2 lg:z-10">
        <CardContent className="p-4">
          <ProblemFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            totalCount={total}
          />
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Results</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {visibleProblems} of {total} problems
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="material-symbols-outlined text-sm">tune</span>
              {filters.sort || 'recent'}
            </span>
          </div>
        </CardHeader>

        {problems.length === 0 ? (
          <EmptyState icon={FolderOpen} title="暂无题目" description="还没有发布任何题目" />
        ) : (
          <ProblemTable problems={problems} showSolvedStatus={false} />
        )}
      </Card>

      {/* Pagination */}
      <Card>
        <CardContent className="flex items-center justify-between px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Page <span className="font-medium text-foreground">{page}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }))}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
