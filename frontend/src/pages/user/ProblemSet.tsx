import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProblemFilters } from '@/components/problems/ProblemFilters'
import { ProblemTable } from '@/components/problems/ProblemTable'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { useProblems } from '@/hooks/useProblems'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import type { ProblemFilters as ProblemFiltersParams } from '@/services/problems'

export function ProblemSet() {
  const [filters, setFilters] = useState<ProblemFiltersParams>({
    difficulty: 'all',
    sort: 'recent',
    page: 1,
    limit: 20,
  })

  const { data, isLoading, error } = useProblems(filters)
  const problems = data?.problems ?? []
  const total = data?.total ?? 0
  const page = filters.page ?? 1
  const limit = filters.limit ?? 20
  const totalPages = data?.pages ?? (total > 0 ? Math.ceil(total / limit) : 1)

  const visibleProblems = problems.length
  const easyCount = problems.filter((problem) => problem.difficulty === 'easy').length
  const mediumHardCount = problems.filter((problem) => problem.difficulty !== 'easy').length
  const tagCount = new Set(problems.flatMap((problem) => problem.tags)).size

  const handleFiltersChange = (nextFilters: ProblemFiltersParams) => {
    setFilters(nextFilters)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loading message="Loading problems..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="Failed to Load Problems"
          description="Please try again later."
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Problem Repository"
        title="题库"
        description="按难度、标签和搜索条件浏览真实题目数据。页面保持列表/筛选导向，不再堆叠额外营销层。"
        actions={
          <>
            <Button as={Link} to="/submissions" variant="outline">
              <span className="material-symbols-outlined text-base">history</span>
              Submission History
            </Button>
            <Button as={Link} to="/contests" variant="primary">
              <span className="material-symbols-outlined text-base">emoji_events</span>
              Explore Contests
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="题库总量" value={`${total} 题`} helper="当前可检索题目数量" />
        <StatCard label="当前结果" value={`${visibleProblems} 题`} helper="符合当前过滤条件" />
        <StatCard label="Easy Pool" value={`${easyCount} 题`} helper="结果集中的简单题数量" />
        <StatCard label="活跃标签" value={`${tagCount} 个`} helper={`${mediumHardCount} 道中高难题`} />
      </div>

      <SurfaceCard>
        <ProblemFilters filters={filters} onFiltersChange={handleFiltersChange} totalCount={total} />
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <SectionBlock
          title="题目列表"
          description={`${visibleProblems} / ${total} 道题目展示在当前视图中。`}
        >
          {problems.length === 0 ? (
            <EmptyState
              title="No Problems Found"
              description="Try adjusting your filters or search terms."
              className="border-slate-200 bg-slate-50 py-12"
            />
          ) : (
            <ProblemTable problems={problems} showSolvedStatus={false} />
          )}
        </SectionBlock>

        <SurfaceCard tone="muted">
          <h2 className="text-lg font-semibold text-slate-950">筛选摘要</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900">Difficulty</p>
              <p className="mt-1">{filters.difficulty || 'all'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900">Sort</p>
              <p className="mt-1">{filters.sort || 'recent'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900">Search</p>
              <p className="mt-1">{filters.search?.trim() ? filters.search : 'none'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900">Tags</p>
              <p className="mt-1">{(filters.tags || []).length} selected</p>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-950">{visibleProblems}</span> of{' '}
            <span className="font-semibold text-slate-950">{total}</span> problems
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <span className="min-w-20 text-center text-sm text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, page: Math.min(totalPages, page + 1) }))
              }
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </SurfaceCard>
    </div>
  )
}
