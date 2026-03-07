import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, ChevronRight, EyeOff, LibraryBig, Search, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { adminService } from '@/services/admin'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

type DifficultyType = 'easy' | 'medium' | 'hard'
type SortType = 'recent' | 'title' | 'submissions' | 'acceptance'

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', color: 'bg-green-100 text-green-700' },
  medium: { label: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { label: '困难', color: 'bg-rose-100 text-rose-700' },
}

export function ProblemManagement() {
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['adminProblems', search, difficulty, status, sortBy, page],
    queryFn: () =>
      adminService.getProblems({
        search: search || undefined,
        difficulty: difficulty === 'all' ? undefined : (difficulty as DifficultyType),
        status: status === 'all' ? undefined : status,
        sort: sortBy,
        page,
        limit: 20,
      }),
  })

  const problems = data?.problems || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const stats = useMemo(() => {
    const publishedCount = problems.filter((problem) => problem.status === 'published').length
    const draftCount = problems.filter((problem) => problem.status === 'draft').length
    const lowCoverageCount = problems.filter((problem) => {
      if (problem.submissions_count === 0) return true
      return (problem.accepted_count / problem.submissions_count) * 100 < 30
    }).length
    const averageAcceptance = problems.length > 0
      ? Math.round(
          problems.reduce((sum, problem) => {
            if (problem.submissions_count === 0) return sum
            return sum + (problem.accepted_count / problem.submissions_count) * 100
          }, 0) / problems.length,
        )
      : 0

    return { publishedCount, draftCount, lowCoverageCount, averageAcceptance }
  }, [problems])

  if (isLoading) {
    return <Loading message="加载题目管理视图..." />
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-rose-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">题目管理加载失败</h2>
        <p className="mt-2 text-sm text-slate-600">当前无法读取真实题库数据。</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-5 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Problem Management</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Problems</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  按 reference 的后台题库页重做，但保持当前交付边界: 这是只读管理视图，用于观察题库质量和发布状态，不伪装 CRUD 能力。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
              <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Read-only Surface</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">当前是只读运营视图</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                本页用于核对题目发布状态、难度分布和提交表现。创建、编辑、删除、批量发布等后台写操作尚未接入独立
                admin API，因此当前交付明确锁定为只读。
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            no admin crud endpoints
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Problems</span>
            <LibraryBig className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{total}</div>
          <p className="mt-2 text-sm text-slate-600">当前分页条件下的总题目量。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Published</span>
            <ShieldCheck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-emerald-600">{stats.publishedCount}</div>
          <p className="mt-2 text-sm text-slate-600">当前列表中的公开题目数量。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Draft / Hidden</span>
            <EyeOff className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-amber-600">{stats.draftCount}</div>
          <p className="mt-2 text-sm text-slate-600">按真实可见性映射出的非公开条目。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Low Acceptance</span>
            <BookOpen className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-rose-600">{stats.lowCoverageCount}</div>
          <p className="mt-2 text-sm text-slate-600">通过率低于 30% 或暂无提交的题目。</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="搜索题目标题、ID 或标签..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value)
                  setPage(1)
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有状态</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            Avg Acceptance {stats.averageAcceptance}%
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-6 py-4">
          {[
            { value: 'recent', label: '最新' },
            { value: 'title', label: '标题' },
            { value: 'submissions', label: '提交数' },
            { value: 'acceptance', label: '通过率' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSortBy(option.value as SortType)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                sortBy === option.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ID / Title</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Difficulty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Delivery Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {problems.map((problem) => {
                const acceptanceRate = problem.submissions_count > 0
                  ? Math.round((problem.accepted_count / problem.submissions_count) * 100)
                  : 0

                return (
                  <tr key={problem.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-950">
                        #{problem.id} {problem.title}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">Author: {problem.author_username || 'system'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-medium', DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.color)}>
                        {DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.label ?? problem.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-medium',
                          problem.status === 'published' && 'bg-emerald-100 text-emerald-700',
                          problem.status === 'draft' && 'bg-amber-100 text-amber-700',
                          problem.status === 'archived' && 'bg-slate-100 text-slate-700',
                        )}
                      >
                        {problem.status === 'published' ? '已发布' : problem.status === 'draft' ? '草稿' : '已归档'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex max-w-xs flex-wrap gap-2">
                        {problem.tags.length > 0 ? (
                          problem.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700">
                        <div>{problem.submissions_count} submissions</div>
                        <div className="mt-1 text-slate-500">{problem.accepted_count} accepted · {acceptanceRate}%</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      只读交付。写操作待独立 admin API 落地后再开放。
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {problems.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="text-lg font-semibold text-slate-900">未找到题目</div>
            <p className="mt-2 text-sm text-slate-600">尝试调整筛选条件，或者确认当前环境是否已导入演示题目。</p>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            当前交付只读后台视图，第 {page} / {totalPages} 页
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              上一页
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
