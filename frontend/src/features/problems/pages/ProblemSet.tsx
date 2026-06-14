import { useState } from 'react'
import { useProblems } from '@/features/problems/hooks/useProblems'
import { ProblemTable } from '@/features/problems/components/ProblemTable'
import { ProblemFilters } from '@/features/problems/components/ProblemFilters'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { FolderOpen, History, Trophy } from 'lucide-react'
import { ProblemListSkeleton } from '@/features/problems/components/ProblemListSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import type { ProblemFilters as ProblemFiltersParams } from '@/features/problems/services/problems'

export function ProblemSet() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<ProblemFiltersParams>(() => filtersFromSearchParams(searchParams))

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
    <div className="space-y-6 p-6 min-h-screen animate-fade-in-up">
      {/* Header — Vercel clean minimalism */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
            题库
          </span>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            题目
          </h1>
          <p className="mt-1 text-sm text-text-tertiary max-w-lg font-normal">
            浏览题库。按难度和主题筛选，然后开始解题。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="glass-interactive button-press"
            render={<Link to="/submissions" />}
          >
            <History className="w-4 h-4 mr-1.5" />
            提交记录
          </Button>
          <Button
            size="sm"
            className="button-press bg-primary text-primary-foreground hover:bg-primary/90 shadow-whisper"
            render={<Link to="/contests" />}
          >
            <Trophy className="w-4 h-4 mr-1.5" />
            竞赛
          </Button>
        </div>
      </div>

      {/* Stats row — glass interactive panels with dynamic difficulty glows */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="glass-interactive hover-lift rounded-xl p-5 border border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
            总计
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{total}</p>
        </div>

        <div className="glass-interactive hover-lift rounded-xl p-5 border border-border/60 hover:border-difficulty-easy/30 hover:bg-difficulty-easy/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-difficulty-easy">
            简单
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{easyCount}</p>
        </div>

        <div className="glass-interactive hover-lift rounded-xl p-5 border border-border/60 hover:border-difficulty-medium/30 hover:bg-difficulty-medium/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-difficulty-medium">
            中等
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{mediumCount}</p>
        </div>

        <div className="glass-interactive hover-lift rounded-xl p-5 border border-border/60 hover:border-difficulty-hard/30 hover:bg-difficulty-hard/[0.02]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-difficulty-hard">
            困难
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{hardCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass shadow-elevated rounded-xl p-5 border border-border/50 backdrop-blur-md lg:sticky lg:top-4 lg:z-10">
        <ProblemFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={total}
        />
      </div>

      {/* Results */}
      <div className="glass shadow-card rounded-xl border border-border/50 overflow-hidden">
        <div className="border-b border-border/50 px-6 py-4 bg-white/[0.01]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">结果</p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {visibleProblems} / {total} 道题目
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              筛选: {describeFilters(filters)}
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
      <div className="glass shadow-card rounded-xl border border-border/50 px-5 py-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-tertiary">
            第 <span className="font-semibold text-foreground">{page}</span> 页，共{' '}
            <span className="font-semibold text-foreground">{totalPages}</span> 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="glass-interactive button-press"
              disabled={page <= 1}
              onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, page - 1) }))}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="glass-interactive button-press"
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

function filtersFromSearchParams(searchParams: URLSearchParams): ProblemFiltersParams {
  const difficulty = searchParams.get('difficulty')
  const sort = searchParams.get('sort')
  const page = Number(searchParams.get('page') ?? 1)
  const tags = (searchParams.get('tags') ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  return {
    difficulty: difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' ? difficulty : 'all',
    sort: sort === 'popular' || sort === 'easy_first' || sort === 'hard_first' ? sort : 'recent',
    search: searchParams.get('search') ?? '',
    tags,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: 20,
  }
}

function describeFilters(filters: ProblemFiltersParams): string {
  const parts = [filters.sort || 'recent']
  if (filters.search) parts.push(`搜索 ${filters.search}`)
  if (filters.difficulty && filters.difficulty !== 'all') parts.push(filters.difficulty)
  if (filters.tags?.length) parts.push(`标签 ${filters.tags.join(', ')}`)
  return parts.join(' / ')
}
