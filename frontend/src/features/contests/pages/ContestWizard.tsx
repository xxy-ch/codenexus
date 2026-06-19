import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, Eye, FileText, Search, Timer, Trophy } from 'lucide-react'
import { useProblems } from '@/features/problems/hooks/useProblems'
import { contestsService, type CreateContestPayload } from '@/features/contests/services/contests'
import type { Problem } from '@/features/problems/types/problems'

const RULESETS = [
  {
    value: 'acm',
    title: 'ACM / ICPC',
    description: '按解题数和罚时排名，适合公开赛和训练赛。',
  },
  {
    value: 'ioi',
    title: 'IOI',
    description: '支持部分分，适合作业和多测试点评分场景。',
  },
  {
    value: 'education',
    title: 'Classic OI',
    description: '更适合教学和阶段性考核，强调标准评测流程。',
  },
] as const

const STEPS = [
  { id: 1, title: '基本信息', description: '竞赛名称、时间与组织信息' },
  { id: 2, title: '题目配置', description: '选择题目、分数和顺序' },
  { id: 3, title: '参赛者', description: '后续通过班级和报名页组织参赛范围' },
  { id: 4, title: '高级设置', description: '榜单冻结与可见性' },
]

type ContestProblemDraft = {
  problemId: string
  category: string
  points: number
  orderIndex: number
}

function toUtcInputValue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toUtcIsoString(value: string) {
  if (!value) return ''
  return new Date(value).toISOString()
}

export function ContestWizard() {
  const [form, setForm] = useState<CreateContestPayload>({
    organization_id: 1,
    name: '',
    description: '',
    rules: 'acm',
    start_time: '',
    end_time: '',
    freeze_minutes: 0,
  })
  const [message, setMessage] = useState<string>('')
  const [problemSearch, setProblemSearch] = useState('')
  const [problemDifficulty, setProblemDifficulty] = useState<'all' | Problem['difficulty']>('all')
  const [selectedProblems, setSelectedProblems] = useState<ContestProblemDraft[]>([])
  const { data: problemData, isLoading: problemsLoading } = useProblems({
    search: problemSearch,
    difficulty: problemDifficulty,
    limit: 100,
    page: 1,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: CreateContestPayload) => {
      const contest = await contestsService.createContest(payload)
      await Promise.all(
        selectedProblems.map((problem) =>
          contestsService.addProblem(contest.id, {
            problem_id: Number(problem.problemId),
            category: problem.category,
            points: problem.points,
            order_index: problem.orderIndex,
          }),
        ),
      )
      return contest
    },
    onSuccess: (data) => {
      setMessage(`创建成功，竞赛 ID: ${data.id}，已配置 ${selectedProblems.length} 道题`)
    },
    onError: (error: any) => {
      setMessage(`创建失败: ${error?.response?.data?.message || error?.message || 'unknown error'}`)
    },
  })

  const durationHours = useMemo(() => {
    if (!form.start_time || !form.end_time) return '--'
    const diff = new Date(form.end_time).getTime() - new Date(form.start_time).getTime()
    if (Number.isNaN(diff) || diff <= 0) return '--'
    return (diff / 3600000).toFixed(diff % 3600000 === 0 ? 0 : 1)
  }, [form.end_time, form.start_time])

  const selectedRuleset = RULESETS.find((item) => item.value === form.rules) ?? RULESETS[0]
  const problems = problemData?.problems ?? []
  const selectedProblemIds = new Set(selectedProblems.map((problem) => problem.problemId))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      start_time: toUtcIsoString(form.start_time),
      end_time: toUtcIsoString(form.end_time),
    })
  }

  const toggleProblem = (problem: Problem) => {
    setSelectedProblems((prev) => {
      if (prev.some((item) => item.problemId === problem.id)) {
        return prev.filter((item) => item.problemId !== problem.id)
      }
      return [
        ...prev,
        {
          problemId: problem.id,
          category: '默认',
          points: problem.points || 100,
          orderIndex: prev.length + 1,
        },
      ]
    })
  }

  const updateSelectedProblem = (
    problemId: string,
    patch: Partial<Pick<ContestProblemDraft, 'category' | 'points' | 'orderIndex'>>,
  ) => {
    setSelectedProblems((prev) =>
      prev.map((item) => (item.problemId === problemId ? { ...item, ...patch } : item)),
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>教师工作台</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>竞赛</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">创建新竞赛</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">创建新竞赛</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                配置竞赛名称、规则、时间窗口和榜单冻结策略。
              </p>
            </div>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <Timer className="h-4 w-4" />
                时长
              </div>
              <div className="mt-3 text-2xl font-bold text-foreground">{durationHours}h</div>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                <Trophy className="h-4 w-4" />
                规则
              </div>
              <div className="mt-3 text-lg font-bold text-foreground">{selectedRuleset.title}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps + Form */}
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-1">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`rounded-lg border px-4 py-3 ${
                  step.id === 1
                    ? 'border-primary/30 bg-primary/5 text-primary'
                    : 'border-transparent bg-muted/50 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      step.id === 1 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'
                    }`}
                  >
                    {step.id}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{step.title}</div>
                    <div className="text-xs leading-5 opacity-80">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={onSubmit} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="space-y-10 p-6 md:p-8">
            {/* Basic Info */}
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">基本信息</h2>
                <p className="mt-1 text-sm text-muted-foreground">定义竞赛的核心身份、时间窗口和归属范围。</p>
              </div>

              <div className="grid gap-5">
                <label className="space-y-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">竞赛标题</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="例如：Spring 2026 Coding Cup"
                    required
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">组织 ID</span>
                    <input
                      type="number"
                      min="1"
                      value={form.organization_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, organization_id: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">校区 ID</span>
                    <input
                      type="number"
                      min="1"
                      value={form.campus_id ?? ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          campus_id: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="可留空"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">描述</span>
                  <textarea
                    value={form.description ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[120px] w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="说明竞赛用途、允许语言或参赛须知。"
                  />
                </label>
              </div>
            </section>

            {/* Schedule */}
            <section className="space-y-6 border-t border-border pt-8">
              <div>
                <h2 className="text-lg font-semibold text-foreground">时间安排</h2>
                <p className="mt-1 text-sm text-muted-foreground">后端要求 UTC 时间，页面会自动从本地输入转换后提交。</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">开始时间</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={toUtcInputValue(form.start_time)}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">结束时间</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={toUtcInputValue(form.end_time)}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      required
                    />
                  </div>
                </label>
              </div>
            </section>

            {/* Rule Set */}
            <section className="space-y-6 border-t border-border pt-8">
              <div>
                <h2 className="text-lg font-semibold text-foreground">规则集</h2>
                <p className="mt-1 text-sm text-muted-foreground">选择适合本次竞赛的排名与计分方式。</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {RULESETS.map((ruleset) => {
                  const active = form.rules === ruleset.value
                  return (
                    <button
                      key={ruleset.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, rules: ruleset.value }))}
                      className={`rounded-xl border p-5 text-left transition ${
                        active
                          ? 'border-primary/50 bg-primary/5 shadow-sm'
                          : 'border-border bg-muted/50 hover:border-border hover:bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">{ruleset.title}</div>
                          <div className="mt-2 text-xs leading-6 text-muted-foreground">{ruleset.description}</div>
                        </div>
                        <div
                          className={`mt-1 h-4 w-4 rounded-full border ${
                            active ? 'border-primary bg-primary ring-4 ring-primary/20' : 'border-border bg-card'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* Problems */}
            <section className="space-y-6 border-t border-border pt-8">
              <div>
                <h2 className="text-lg font-semibold text-foreground">题目配置</h2>
                <p className="mt-1 text-sm text-muted-foreground">选择题目并设置分数、出题顺序，发布时会同步写入竞赛。</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                    <label className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={problemSearch}
                        onChange={(e) => setProblemSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        placeholder="搜索题目"
                      />
                    </label>
                    <select
                      value={problemDifficulty}
                      onChange={(e) => setProblemDifficulty(e.target.value as typeof problemDifficulty)}
                      className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="all">全部难度</option>
                      <option value="easy">简单</option>
                      <option value="medium">中等</option>
                      <option value="hard">困难</option>
                    </select>
                  </div>

                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {problemsLoading ? (
                      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                        正在加载题库...
                      </div>
                    ) : problems.length === 0 ? (
                      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                        没有匹配题目
                      </div>
                    ) : (
                      problems.map((problem) => {
                        const checked = selectedProblemIds.has(problem.id)
                        return (
                          <label
                            key={problem.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition hover:border-primary/30"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProblem(problem)}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-foreground">{problem.title}</span>
                              <span className="text-xs text-muted-foreground">
                                #{problem.id} / {problem.difficulty} / {problem.points || 100} 分
                              </span>
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="mb-3 text-sm font-semibold text-foreground">
                    已选题目 ({selectedProblems.length})
                  </div>
                  {selectedProblems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                      暂未选择题目
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProblems.map((item) => {
                        const problem = problems.find((p) => p.id === item.problemId)
                        return (
                          <div key={item.problemId} className="rounded-lg border border-border bg-card p-3">
                            <div className="truncate text-sm font-medium text-foreground">
                              {problem?.title ?? `题目 #${item.problemId}`}
                            </div>
                            <label className="mt-3 block space-y-1 text-xs text-muted-foreground">
                              <span>分类</span>
                              <input
                                value={item.category}
                                onChange={(e) =>
                                  updateSelectedProblem(item.problemId, { category: e.target.value })
                                }
                                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                                placeholder="默认"
                              />
                            </label>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span>顺序</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.orderIndex}
                                  onChange={(e) =>
                                    updateSelectedProblem(item.problemId, { orderIndex: Number(e.target.value) })
                                  }
                                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                                />
                              </label>
                              <label className="space-y-1 text-xs text-muted-foreground">
                                <span>分数</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.points}
                                  onChange={(e) =>
                                    updateSelectedProblem(item.problemId, { points: Number(e.target.value) })
                                  }
                                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                                />
                              </label>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Visibility & Freeze */}
            <section className="space-y-6 border-t border-border pt-8">
              <div>
                <h2 className="text-lg font-semibold text-foreground">榜单冻结</h2>
                <p className="mt-1 text-sm text-muted-foreground">设置赛末封榜时间，降低最后阶段排名波动带来的干扰。</p>
              </div>

              <div className="rounded-xl border border-border bg-muted/50 p-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Eye className="h-4 w-4" />
                      冻结榜单
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      填写 0 表示不封榜。
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={form.freeze_minutes ?? 0}
                      onChange={(e) => setForm((prev) => ({ ...prev, freeze_minutes: Number(e.target.value) }))}
                      className="mt-4 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="rounded-lg border border-lime-500/30 bg-lime-500/5 p-4 text-xs text-lime-300">
                    <div className="font-semibold">赛后配置提示</div>
                    <ul className="mt-3 space-y-2 leading-6 text-lime-300/80">
                      <li>题目会在发布时同步保存到竞赛。</li>
                      <li>参赛者范围可通过班级和报名页组织。</li>
                      <li>冻结分钟数会影响榜单最后阶段的展示。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 border-t border-border bg-muted/50 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <FileText className="h-4 w-4" />
              {message ? <span>{message}</span> : <span>发布时会保存基本信息、规则、题目分数和顺序。</span>}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMessage('当前未实现草稿持久化，避免制造假能力。')}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                保存草稿
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending ? '发布中...' : '发布竞赛'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
