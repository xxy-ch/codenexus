import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { adminService } from '@/services/admin'
import { cn } from '@/lib/utils'

type DifficultyType = 'easy' | 'medium' | 'hard'
type SortType = 'recent' | 'title' | 'submissions' | 'acceptance'

const DIFFICULTY_CONFIG: Record<DifficultyType, { label: string; className: string }> = {
  easy: { label: '简单', className: 'bg-tertiary-container text-on-tertiary-fixed-variant' },
  medium: { label: '中等', className: 'bg-secondary-container text-on-secondary-container' },
  hard: { label: '困难', className: 'bg-error-container text-on-error-container' },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: { label: '已发布', className: 'bg-tertiary-container text-on-tertiary-fixed-variant' },
  draft: { label: '草稿', className: 'bg-secondary-container text-on-secondary-container' },
  archived: { label: '已归档', className: 'bg-surface-container-low text-on-surface-variant' },
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
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="加载题目管理视图..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="题目管理加载失败"
          description="当前无法读取真实题库数据。"
          action={{ label: '重试', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 题库管理
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            题目管理
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            题库后台提供题目创建、编辑、删除和筛选功能。所有操作连接真实 API 接口。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => refetch()}>
            <span className="material-symbols-outlined text-base">refresh</span>
            刷新
          </Button>
          <div className="rounded-full bg-on-surface px-4 py-2 text-sm font-semibold text-surface">
            增删改查在线
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card variant="surface" className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-on-surface">最小可交付题目后台</h2>
          <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
            本页负责题目创建、基础编辑、删除和列表筛选。更细粒度题面与判题数据仍分别在"题面配置"和"判题设置"页面维护。
          </p>
        </div>
        <span className="rounded-full border border-tertiary bg-tertiary-container px-4 py-2 text-xs font-semibold uppercase tracking-wider text-on-tertiary-fixed-variant">
          创建 / 编辑 / 删除已启用
        </span>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">题目总数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{total}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前分页条件下的总题目量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">已发布</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">{stats.publishedCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前列表中的公开题目数量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">草稿 / 隐藏</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{stats.draftCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">按真实可见性映射出的非公开条目</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">低通过率</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-error">{stats.lowCoverageCount}</p>
          <p className="mt-2 text-sm text-on-surface-variant">通过率低于 30% 或暂无提交的题目</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Form Card */}
        <Card variant="default" className="p-6">
          <div className="mb-4">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">
              {formMode === 'create' ? '新建题目' : `编辑题目 #${editingId}`}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              这里维护后台最小可交付题目信息
            </p>
          </div>

          <div className="space-y-4">
            {formMode === 'edit' ? (
              <div className="flex justify-end">
                <Button variant="outline" onClick={resetForm}>
                  取消编辑
                </Button>
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">题目标题</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="题目标题"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">题目描述</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="题目描述"
                rows={6}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">难度</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value as DifficultyType }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">可见性</label>
                <select
                  value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value as typeof form.visibility }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="private">仅自己可见</option>
                  <option value="public">公开</option>
                  <option value="campus">校区可见</option>
                  <option value="class">班级可见</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">时间限制 (ms)</label>
                <Input
                  type="number"
                  value={form.time_limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">内存限制 (KB)</label>
                <Input
                  type="number"
                  value={form.memory_limit}
                  onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                />
              </div>
            </div>

            <Button
              fullWidth
              onClick={() => (formMode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
              disabled={!form.title || !form.description || createMutation.isPending || updateMutation.isPending}
            >
              <span className="material-symbols-outlined text-base">add</span>
              {submitLabel}
            </Button>
          </div>
        </Card>

        {/* Problem List */}
        <div className="space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Input
                  type="search"
                  aria-label="搜索题目"
                  placeholder="搜索题目标题、ID 或标签..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <select
                aria-label="难度筛选"
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
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
                className="h-10 rounded-lg border border-outline-variant bg-surface px-4 text-sm font-medium text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">所有状态</option>
                <option value="published">已发布</option>
                <option value="draft">草稿</option>
                <option value="archived">已归档</option>
              </select>
            </div>
          </Card>

          {/* Sort Buttons */}
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
                  'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                  sortBy === option.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                )}
              >
                {option.label}
              </button>
            ))}
            <span className="ml-2 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <span className="material-symbols-outlined text-base">tune</span>
              平均 {stats.averageAcceptance}%
            </span>
          </div>

          {/* Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline-variant/10">
                <thead className="bg-surface-container-low/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">编号 / 标题</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">难度</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">状态</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">标签</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">统计</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {problems.map((problem) => {
                    const acceptanceRate =
                      problem.submissions_count > 0 ? Math.round((problem.accepted_count / problem.submissions_count) * 100) : 0

                    return (
                      <tr key={problem.id} className="align-top transition-colors hover:bg-surface-container-low/30">
                        <td className="px-5 py-4">
                          <div className="font-medium text-on-surface">
                            #{problem.id} {problem.title}
                          </div>
                          <div className="mt-1 text-xs text-on-surface-variant">作者：{problem.author_username || '系统'}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.className)}>
                            {DIFFICULTY_CONFIG[problem.difficulty as DifficultyType]?.label ?? problem.difficulty}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-xs font-medium',
                              STATUS_CONFIG[problem.status]?.className ?? STATUS_CONFIG.draft.className
                            )}
                          >
                            {STATUS_CONFIG[problem.status]?.label ?? problem.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex max-w-xs flex-wrap gap-2">
                            {problem.tags.length > 0 ? (
                              problem.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs text-on-surface-variant">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-on-surface-variant">暂无标签</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-on-surface">
                          <div>{problem.submissions_count} 次提交</div>
                          <div className="mt-1 text-on-surface-variant">
                            {problem.accepted_count} 次通过 · {acceptanceRate}%
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(problem)}>
                              <span className="material-symbols-outlined text-base">edit</span>
                              编辑
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-error-container text-error hover:bg-error-container/10"
                              onClick={() => {
                                if (window.confirm(`确认删除题目 #${problem.id} ${problem.title} ?`)) {
                                  deleteMutation.mutate(problem.id)
                                }
                              }}
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
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
              <div className="p-12">
                <EmptyState
                  title="未找到题目"
                  description="尝试调整筛选条件，或者确认当前环境是否已导入基础题库数据。"
                  icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">library_books</span>}
                />
              </div>
            ) : null}

            {/* Pagination */}
            <div className="flex flex-col gap-4 border-t border-outline-variant/10 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-on-surface-variant">
                当前交付已接通后台 CRUD，第 {page} / {totalPages} 页
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                  上一页
                </Button>
                <Button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  下一页
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProblemManagement
