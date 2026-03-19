import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, EyeOff, LibraryBig, Pencil, Plus, RotateCcw, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
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
    const averageAcceptance =
      problems.length > 0
        ? Math.round(
            problems.reduce((sum, problem) => {
              if (problem.submissions_count === 0) return sum
              return sum + (problem.accepted_count / problem.submissions_count) * 100
            }, 0) / problems.length,
          )
        : 0

    return { publishedCount, draftCount, lowCoverageCount, averageAcceptance }
  }, [problems])

  const resetForm = () => {
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
  }

  const invalidateProblems = () => queryClient.invalidateQueries({ queryKey: ['adminProblems'] })

  const createMutation = useMutation({
    mutationFn: () =>
      adminService.createProblem({
        ...form,
        organization_id: 1,
      }),
    onSuccess: () => {
      invalidateProblems()
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => adminService.updateProblem(editingId!, form),
    onSuccess: () => {
      invalidateProblems()
      resetForm()
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
    return <Loading message="加载题目管理视图..." />
  }

  if (error) {
    return (
      <EmptyState
        title="题目管理加载失败"
        description="当前无法读取真实题库数据。"
        action={<Button onClick={() => refetch()}>重试</Button>}
        className="border-rose-200 bg-rose-50"
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        breadcrumb={['Problems']}
        title="题目管理"
        description="题库后台切到统一的管理模式。创建、编辑、删除、筛选和可见性维护继续使用当前 `/problems` 读写链路，不改接口行为。"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              <RotateCcw className="h-4 w-4" />
              刷新
            </Button>
            <div className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">CRUD Live</div>
          </>
        }
      />

      <SurfaceCard tone="muted" className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-950">最小可交付题目后台</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            本页负责题目创建、基础编辑、删除和列表筛选。更细粒度题面与测试点仍分别在 `Problem Content` 和 `Judge Settings` 页面维护。
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          create / edit / delete enabled
        </div>
      </SurfaceCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Problems" value={total} helper="当前分页条件下的总题目量。" />
        <StatCard label="Published" value={<span className="text-emerald-600">{stats.publishedCount}</span>} helper="当前列表中的公开题目数量。" />
        <StatCard label="Draft / Hidden" value={<span className="text-amber-600">{stats.draftCount}</span>} helper="按真实可见性映射出的非公开条目。" />
        <StatCard label="Low Acceptance" value={<span className="text-rose-600">{stats.lowCoverageCount}</span>} helper="通过率低于 30% 或暂无提交的题目。" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <SectionBlock title={formMode === 'create' ? '新建题目' : `编辑题目 #${editingId}`} description="这里维护后台最小可交付题目信息。">
          <div className="space-y-4">
            {formMode === 'edit' ? (
              <div className="flex justify-end">
                <Button variant="outline" onClick={resetForm}>
                  取消编辑
                </Button>
              </div>
            ) : null}

            <FieldGroup label="题目标题">
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="题目标题"
                className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </FieldGroup>

            <FieldGroup label="题目描述">
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="题目描述"
                className="min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </FieldGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="难度">
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as DifficultyType }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </FieldGroup>
              <FieldGroup label="可见性">
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as typeof form.visibility }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="private">private</option>
                  <option value="public">public</option>
                  <option value="campus">campus</option>
                  <option value="class">class</option>
                </select>
              </FieldGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label="Time Limit">
                <input
                  type="number"
                  value={form.time_limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </FieldGroup>
              <FieldGroup label="Memory Limit">
                <input
                  type="number"
                  value={form.memory_limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                  className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </FieldGroup>
            </div>

            <Button
              fullWidth
              onClick={() => (formMode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
              disabled={!form.title || !form.description || createMutation.isPending || updateMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {submitLabel}
            </Button>
          </div>
        </SectionBlock>

        <SectionBlock title="题库列表" description="共享筛选条和密集表格统一了管理端浏览模式。">
          <div className="space-y-5">
            <FilterBar>
              <div className="min-w-[260px] flex-1">
                <input
                  aria-label="搜索题目"
                  type="search"
                  placeholder="搜索题目标题、ID 或标签..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
              <select
                aria-label="难度筛选"
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value)
                  setPage(1)
                }}
                className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <select
                aria-label="状态筛选"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">所有状态</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="archived">已归档</option>
              </select>
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <SlidersHorizontal className="h-4 w-4" />
                Avg {stats.averageAcceptance}%
              </div>
            </FilterBar>

            <div className="flex flex-wrap items-center gap-2">
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

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 bg-white">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">ID / Title</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Difficulty</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tags</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Stats</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {problems.map((problem) => {
                    const acceptanceRate =
                      problem.submissions_count > 0 ? Math.round((problem.accepted_count / problem.submissions_count) * 100) : 0

                    return (
                      <tr key={problem.id} className="align-top transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="font-medium text-slate-950">
                            #{problem.id} {problem.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">Author: {problem.author_username || 'system'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.color)}>
                            {DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.label ?? problem.difficulty}
                          </span>
                        </td>
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4">
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
                        <td className="px-5 py-4 text-sm text-slate-700">
                          <div>{problem.submissions_count} submissions</div>
                          <div className="mt-1 text-slate-500">
                            {problem.accepted_count} accepted · {acceptanceRate}%
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(problem)}>
                              <Pencil className="h-4 w-4" />
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                              onClick={() => {
                                if (window.confirm(`确认删除题目 #${problem.id} ${problem.title} ?`)) {
                                  deleteMutation.mutate(problem.id)
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {problems.length === 0 ? (
              <EmptyState title="未找到题目" description="尝试调整筛选条件，或者确认当前环境是否已导入演示题目。" className="shadow-none" />
            ) : null}

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">
                当前交付已接通后台 CRUD，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ArrowLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button variant="primary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  下一页
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SectionBlock>
      </div>
    </div>
  )
}
