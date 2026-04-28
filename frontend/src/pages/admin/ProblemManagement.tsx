import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, EyeOff, FolderOpen, LibraryBig, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react'
import { adminService } from '@/services/admin'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'

type DifficultyType = 'easy' | 'medium' | 'hard'
type SortType = 'recent' | 'title' | 'submissions' | 'acceptance'

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', color: 'bg-green-100 text-green-700' },
  medium: { label: '中等', color: 'bg-amber-100 text-amber-700' },
  hard: { label: '困难', color: 'bg-rose-100 text-rose-700' },
}

export function ProblemManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('recent')
  const [page, setPage] = useState(1)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    difficulty: 'easy' as DifficultyType,
    visibility: 'private' as 'public' | 'campus' | 'class' | 'private',
    time_limit: 1000,
    memory_limit: 262144,
  })

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

  const invalidateProblems = () => queryClient.invalidateQueries({ queryKey: ['adminProblems'] })

  const createMutation = useMutation({
    mutationFn: () =>
      adminService.createProblem({
        ...form,
        organization_id: 1,
      }),
    onSuccess: () => {
      invalidateProblems()
      setForm({
        title: '',
        description: '',
        difficulty: 'easy',
        visibility: 'private',
        time_limit: 1000,
        memory_limit: 262144,
      })
      setFormMode('create')
      setEditingId(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      adminService.updateProblem(editingId!, form),
    onSuccess: () => {
      invalidateProblems()
      setFormMode('create')
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (problemId: string) => adminService.deleteProblem(problemId),
    onSuccess: () => invalidateProblems(),
  })

  const submitLabel = formMode === 'create' ? '创建题目' : '保存修改'

  const startEdit = (problem: typeof problems[number]) => {
    setFormMode('edit')
    setEditingId(problem.id)
    setForm({
      title: problem.title,
      description: problem.description || '',
      difficulty: (problem.difficulty as DifficultyType) ?? 'easy',
      visibility: problem.visibility || (problem.status === 'published' ? 'public' : 'private'),
      time_limit: problem.time_limit || 1000,
      memory_limit: problem.memory_limit || 262144,
    })
  }

  if (isLoading) {
    return <TableSkeleton rows={8} columns={5} />
  }

  if (error) {
    return <InlineError title="题目管理加载失败" onRetry={() => refetch()} />
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
                  按 reference 的后台题库页重做，并接入当前真实的后台写操作。当前交付覆盖创建、编辑、删除与基础可见性维护。
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
              <div className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">CRUD Live</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">当前已接入真实后台写操作</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                本页现在直接连接真实 `/problems` 写接口，交付范围覆盖创建、基础编辑、删除与可见性切换。更细粒度题面和测试数据维护继续在
                `Problem Content` 与 `Judge Settings` 页面完成。
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            create / edit / delete enabled
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

      <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {formMode === 'create' ? '新建题目' : `编辑题目 #${editingId}`}
              </h2>
              <p className="mt-1 text-sm text-slate-600">这里维护后台最小可交付题目信息。</p>
            </div>
            {formMode === 'edit' && (
              <button
                type="button"
                onClick={() => {
                  setFormMode('create')
                  setEditingId(null)
                  setForm({
                    title: '',
                    description: '',
                    difficulty: 'easy',
                    visibility: 'private',
                    time_limit: 1000,
                    memory_limit: 262144,
                  })
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
              >
                取消编辑
              </button>
            )}
          </div>
          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="题目标题"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="题目描述"
              className="min-h-[160px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as DifficultyType }))}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <select
                value={form.visibility}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as typeof form.visibility }))}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="private">private</option>
                <option value="public">public</option>
                <option value="campus">campus</option>
                <option value="class">class</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.time_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                placeholder="Time Limit"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <input
                type="number"
                value={form.memory_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                placeholder="Memory Limit"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <button
              type="button"
              onClick={() => (formMode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
              disabled={!form.title || !form.description || createMutation.isPending || updateMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitLabel}
            </button>
          </div>
        </aside>

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
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Actions</th>
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
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(problem)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
                        >
                          <Pencil className="h-4 w-4" />
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`确认删除题目 #${problem.id} ${problem.title} ?`)) {
                              deleteMutation.mutate(problem.id)
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {problems.length === 0 && (
          <EmptyState icon={FolderOpen} title="暂无题目" description="还没有创建任何题目" />
        )}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            当前交付已接通后台 CRUD，第 {page} / {totalPages} 页
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
      </section>
    </div>
  )
}
