import { useState } from 'react'
import { useProblems } from '@/hooks/useProblems'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { FolderOpen, History, Trophy } from 'lucide-react'
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
      {/* Header — Vercel clean minimalism */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            题库
          </span>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            题目
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-lg">
            浏览题库。按难度和主题筛选，然后开始解题。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link to="/submissions" />}>
              <History className="w-4 h-4 mr-1.5" />
              提交记录
          </Button>
          <Button size="sm" render={<Link to="/contests" />}>
              <Trophy className="w-4 h-4 mr-1.5" />
              竞赛
          </Button>
        </div>
      </div>

      {/* Stats row — Vercel shadow-as-border */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            总计
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{total}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-difficulty-easy">
            简单
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{easyCount}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-difficulty-medium">
            中等
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{mediumCount}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-difficulty-hard">
            困难
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{hardCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 shadow-sm lg:sticky lg:top-2 lg:z-10">
        <ProblemFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={total}
        />
      </div>

      {/* Results */}
      <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">结果</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {visibleProblems} / {total} 道题目
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              筛选: {filters.sort || 'recent'}
            </span>
          </div>
        </div>

        {problems.length === 0 ? (
          <EmptyState icon={FolderOpen} title="暂无题目" description="还没有发布任何题目" />
        ) : (
          <ProblemTable problems={problems} showSolvedStatus={false} />
        )}
      </div>

      {/* Pagination */}
      <div className="bg-card rounded-lg border border-border px-5 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            第 <span className="font-medium text-foreground">{page}</span> 页，共{' '}
            <span className="font-medium text-foreground">{totalPages}</span> 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }))}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
