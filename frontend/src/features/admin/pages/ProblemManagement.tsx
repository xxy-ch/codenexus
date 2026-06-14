import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, EyeOff, FolderOpen, LibraryBig, Pencil, Plus, Search, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react'
import { adminService } from '@/features/admin/services/admin'
import { TableSkeleton } from '@/shared/components/TableSkeleton'
import { EmptyState } from '@/shared/components/EmptyState'
import { InlineError } from '@/shared/components/InlineError'
import { cn } from '@/shared/lib/utils'

type DifficultyType = 'easy' | 'medium' | 'hard'
type SortType = 'recent' | 'title' | 'submissions' | 'acceptance'

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', color: 'bg-status-accepted/10 text-status-accepted' },
  medium: { label: '中等', color: 'bg-difficulty-medium/10 text-difficulty-medium' },
  hard: { label: '困难', color: 'bg-destructive/10 text-destructive' },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">题目管理</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">题目管理</h1>
            <p className="admin-readable-muted mt-2 max-w-3xl text-sm leading-6">
              管理题库的创建、编辑、删除与基础可见性维护。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              刷新
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="admin-readable-label text-[13px] font-semibold uppercase tracking-widest">总题目</span>
            <LibraryBig className="admin-readable-label h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-bold text-foreground">{total}</div>
          <p className="admin-readable-muted mt-2 text-[13px]">当前分页条件下的总题目量。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="admin-readable-label text-[13px] font-semibold uppercase tracking-widest">已发布</span>
            <ShieldCheck className="admin-readable-label h-4 w-4" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-status-accepted" />
            <span className="text-2xl font-bold text-status-accepted">{stats.publishedCount}</span>
          </div>
          <p className="admin-readable-muted mt-2 text-[13px]">当前列表中的公开题目数量。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="admin-readable-label text-[13px] font-semibold uppercase tracking-widest">草稿/隐藏</span>
            <EyeOff className="admin-readable-label h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-bold text-difficulty-medium">{stats.draftCount}</div>
          <p className="admin-readable-muted mt-2 text-[13px]">非公开条目数。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="admin-readable-label text-[13px] font-semibold uppercase tracking-widest">低通过率</span>
            <BookOpen className="admin-readable-label h-4 w-4" />
          </div>
          <div className="mt-4 text-2xl font-bold text-destructive">{stats.lowCoverageCount}</div>
          <p className="admin-readable-muted mt-2 text-[13px]">通过率低于 30% 或暂无提交的题目。</p>
        </div>
      </div>

      {/* Form + Table */}
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Create/Edit Form */}
        <aside className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {formMode === 'create' ? '新建题目' : `编辑题目 #${editingId}`}
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">维护题目核心信息。</p>
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
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
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
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="题目描述"
              className="min-h-[160px] w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as DifficultyType }))}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
              <select
                value={form.visibility}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as typeof form.visibility }))}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <input
                type="number"
                value={form.memory_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                placeholder="Memory Limit"
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => (formMode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
              disabled={!form.title || !form.description || createMutation.isPending || updateMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {submitLabel}
            </button>
          </div>
        </aside>

        {/* Problem Table */}
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative max-w-xl flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="搜索题目标题、ID 或标签..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={difficulty}
                  onChange={(e) => {
                    setDifficulty(e.target.value)
                    setPage(1)
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">所有状态</option>
                  <option value="published">已发布</option>
                  <option value="draft">草稿</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              平均通过率 {stats.averageAcceptance}%
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-5 py-3">
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
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                  sortBy === option.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/40">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">ID / 标题</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">难度</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">状态</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">标签</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">统计</th>
                  <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 bg-transparent">
                {problems.map((problem) => {
                  const acceptanceRate = problem.submissions_count > 0
                    ? Math.round((problem.accepted_count / problem.submissions_count) * 100)
                    : 0

                  return (
                    <tr key={problem.id} className="transition hover:bg-muted/50">
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-foreground">
                          #{problem.id} {problem.title}
                        </div>
                        <div className="mt-1 text-[13px] text-muted-foreground">作者: {problem.author_username || 'system'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn('rounded-full px-3 py-1 text-[13px] font-medium', DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.color)}>
                          {DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.label ?? problem.difficulty}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium',
                            problem.status === 'published' && 'bg-status-accepted/10 text-status-accepted',
                            problem.status === 'draft' && 'bg-difficulty-medium/10 text-difficulty-medium',
                            problem.status === 'archived' && 'bg-muted text-muted-foreground',
                          )}
                        >
                          {problem.status === 'published' && <span className="h-1.5 w-1.5 rounded-full bg-status-accepted" />}
                          {problem.status === 'published' ? '已发布' : problem.status === 'draft' ? '草稿' : '已归档'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex max-w-xs flex-wrap gap-1.5">
                          {problem.tags.length > 0 ? (
                            problem.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[13px] text-muted-foreground">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[13px] text-muted-foreground">无标签</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[13px] text-muted-foreground">
                          <div>{problem.submissions_count} 次提交</div>
                          <div className="mt-0.5">{problem.accepted_count} 通过 / {acceptanceRate}%</div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(problem)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`确认删除题目 #${problem.id} ${problem.title} ?`)) {
                                deleteMutation.mutate(problem.id)
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-[13px] font-medium text-destructive hover:bg-destructive/15 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

          <div className="flex flex-col gap-4 border-t border-border/40 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-[13px] text-muted-foreground">
              已接通后台 CRUD，第 {page} / {totalPages} 页
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-[13px] font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                上一页
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
