import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { cn, formatDateTime } from '@/lib/utils'

type ContestRule = 'acm' | 'ioi' | 'education'

interface ContestFormState {
  organization_id: number
  campus_id?: number
  name: string
  description: string
  rules: ContestRule
  start_time: string
  end_time: string
  freeze_minutes: number
}

interface ContestSummary {
  id: number
  organization_id: number
  campus_id?: number | null
  name: string
  description?: string | null
  rules: string
  start_time: string
  end_time: string
  freeze_minutes?: number | null
  created_at: string
  updated_at: string
}

interface ContestProblemItem {
  id: number
  contest_id: number
  problem_id: number
  title?: string
  difficulty?: string
  points: number
  order_index: number
  created_at: string
}

interface ContestParticipantItem {
  id: number
  contest_id: number
  user_id: string
  registered_at: string
}

const RULESETS = [
  {
    value: 'acm',
    title: 'ACM / ICPC',
    description: '按解题数和罚时排名，适合公开赛与训练营冲榜。',
  },
  {
    value: 'ioi',
    title: 'IOI',
    description: '支持部分分，更适合作业评测和多测试点得分场景。',
  },
  {
    value: 'education',
    title: '教学赛制',
    description: '偏向课堂考核与阶段训练，强调教学过程中的标准评测。',
  },
] as const

const STEPS = [
  { id: 1, title: '基础赛程', description: '名称、时间、归属与赛制基线' },
  { id: 2, title: '题目编排', description: '真实补题、题序与分值编排' },
  { id: 3, title: '参赛者预览', description: '读取已报名名单与参赛记录' },
  { id: 4, title: '规则与发布', description: '保存最终规则、封榜和发布说明' },
] as const

const DRAFT_STORAGE_KEY = 'teacher-contest-wizard-draft'

function toLocalInputValue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function toIsoString(value: string) {
  if (!value) return ''
  return new Date(value).toISOString()
}

function formatDurationHours(startTime: string, endTime: string) {
  if (!startTime || !endTime) return '--'
  const diff = new Date(endTime).getTime() - new Date(startTime).getTime()
  if (Number.isNaN(diff) || diff <= 0) return '--'
  return `${(diff / 3600000).toFixed(diff % 3600000 === 0 ? 0 : 1)}h`
}

function useContestWorkflow(contestId: string | null) {
  const problemsQuery = useQuery({
    queryKey: ['teacher-contest-problems', contestId],
    queryFn: async () => {
      if (!contestId) return [] as ContestProblemItem[]
      const response = await api.get<ContestProblemItem[]>(`/contests/${contestId}/problems`)
      return response.data || []
    },
    enabled: !!contestId,
  })

  const participantsQuery = useQuery({
    queryKey: ['teacher-contest-participants', contestId],
    queryFn: async () => {
      if (!contestId) return [] as ContestParticipantItem[]
      const response = await api.get<ContestParticipantItem[]>(`/contests/${contestId}/participants`)
      return response.data || []
    },
    enabled: !!contestId,
  })

  return { problemsQuery, participantsQuery }
}

export function ContestWizard() {
  const queryClient = useQueryClient()
  const [activeStep, setActiveStep] = useState(1)
  const [contestId, setContestId] = useState<string | null>(null)
  const [contestSummary, setContestSummary] = useState<ContestSummary | null>(null)
  const [message, setMessage] = useState('创建竞赛后会继续补题、看参赛者和保存设置。')
  const [form, setForm] = useState<ContestFormState>({
    organization_id: 1,
    campus_id: undefined,
    name: '',
    description: '',
    rules: 'acm',
    start_time: '',
    end_time: '',
    freeze_minutes: 0,
  })
  const [problemForm, setProblemForm] = useState({
    problem_id: '',
    points: '100',
    order_index: '1',
  })

  const { problemsQuery, participantsQuery } = useContestWorkflow(contestId)

  const selectedRuleset = RULESETS.find((item) => item.value === form.rules) ?? RULESETS[0]
  const contestProblems = problemsQuery.data || []
  const participants = participantsQuery.data || []

  const createMutation = useMutation({
    mutationFn: async (payload: ContestFormState) => {
      const response = await api.post<ContestSummary>('/contests', {
        organization_id: payload.organization_id,
        campus_id: payload.campus_id,
        name: payload.name,
        description: payload.description,
        rules: payload.rules,
        start_time: toIsoString(payload.start_time),
        end_time: toIsoString(payload.end_time),
        freeze_minutes: payload.freeze_minutes,
      })
      return response.data
    },
    onSuccess: (data) => {
      setContestId(String(data.id))
      setContestSummary(data)
      setActiveStep(2)
      setMessage(`创建成功，竞赛 ID: ${data.id}`)
      void queryClient.invalidateQueries({ queryKey: ['teacher-contest-problems', String(data.id)] })
      void queryClient.invalidateQueries({ queryKey: ['teacher-contest-participants', String(data.id)] })
    },
    onError: (error: any) => {
      setMessage(`创建失败: ${error?.response?.data?.message || error?.message || 'unknown error'}`)
    },
  })

  const addProblemMutation = useMutation({
    mutationFn: async (payload: { problem_id: number; points: number; order_index: number }) => {
      if (!contestId) throw new Error('Contest not created')
      const response = await api.post<ContestProblemItem>(`/contests/${contestId}/problems`, payload)
      return response.data
    },
    onSuccess: () => {
      setProblemForm({ problem_id: '', points: '100', order_index: '0' })
      setMessage('题目已加入竞赛')
      void queryClient.invalidateQueries({ queryKey: ['teacher-contest-problems', contestId] })
    },
    onError: (error: any) => {
      setMessage(`补题失败: ${error?.response?.data?.message || error?.message || 'unknown error'}`)
    },
  })

  const removeProblemMutation = useMutation({
    mutationFn: async (problemId: number) => {
      if (!contestId) throw new Error('Contest not created')
      await api.delete(`/contests/${contestId}/problems/${problemId}`)
    },
    onSuccess: () => {
      setMessage('题目已从竞赛中移除')
      void queryClient.invalidateQueries({ queryKey: ['teacher-contest-problems', contestId] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: ContestFormState) => {
      if (!contestId) throw new Error('Contest not created')
      const response = await api.put<ContestSummary>(`/contests/${contestId}`, {
        rules: payload.rules,
        freeze_minutes: payload.freeze_minutes,
      })
      return response.data
    },
    onSuccess: (data) => {
      setContestSummary(data)
      setMessage(`设置已保存，竞赛 ID: ${data.id}`)
    },
    onError: (error: any) => {
      setMessage(`保存失败: ${error?.response?.data?.message || error?.message || 'unknown error'}`)
    },
  })

  const duration = useMemo(() => formatDurationHours(form.start_time, form.end_time), [form.end_time, form.start_time])

  const canCreate = !!form.name.trim() && !!form.start_time && !!form.end_time && !createMutation.isPending
  const canUpdate = !!contestId && !!form.name.trim() && !!form.start_time && !!form.end_time && !updateMutation.isPending
  const canAddProblem = !!contestId && !!problemForm.problem_id.trim() && !!problemForm.points.trim() && !addProblemMutation.isPending

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!savedDraft) return

    try {
      const draft = JSON.parse(savedDraft) as {
        activeStep?: number
        createdContestId?: number | string
        form?: Partial<ContestFormState>
        problemId?: string
        problemPoints?: string
        problemOrderIndex?: string
      }

      if (draft.form) {
        setForm((current) => ({
          ...current,
          ...draft.form,
          rules: (draft.form.rules as ContestRule | undefined) ?? current.rules,
        }))
      }

      if (draft.createdContestId != null) {
        setContestId(String(draft.createdContestId))
      }

      if (draft.activeStep) {
        setActiveStep(draft.activeStep)
      }

      if (draft.problemId || draft.problemPoints || draft.problemOrderIndex) {
        setProblemForm((current) => ({
          problem_id: draft.problemId ?? current.problem_id,
          points: draft.problemPoints ?? current.points,
          order_index: draft.problemOrderIndex ?? current.order_index,
        }))
      }
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!contestId) return
    setActiveStep((current) => (current < 2 ? 2 : current))
  }, [contestId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        activeStep,
        createdContestId: contestId ? Number(contestId) : null,
        form,
        isPrivate: false,
        problemId: problemForm.problem_id,
        problemPoints: problemForm.points,
        problemOrderIndex: problemForm.order_index,
      }),
    )
  }, [activeStep, contestId, form, problemForm])

  const handleCreate = () => {
    createMutation.mutate(form)
  }

  const handleSaveSettings = () => {
    updateMutation.mutate(form)
  }

  const handleAddProblem = () => {
    addProblemMutation.mutate({
      problem_id: Number(problemForm.problem_id),
      points: Number(problemForm.points),
      order_index: Number(problemForm.order_index),
    })
  }

  const handleStepClick = (stepId: number) => {
    if (stepId === 1 || contestId) {
      setActiveStep(stepId)
    }
  }

  const orchestrationStatus = contestId ? '已创建主赛程' : '等待编排启动'

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            教师工作台 / 竞赛中心 / 竞赛编排台
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            竞赛编排台
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            这页对齐内部编排工作台：先落赛程，再编排题目、读取真实参赛者记录，最后保存规则与发布说明。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {contestId ? (
            <>
              <Button variant="outline" as={Link} to={`/contests/${contestId}`}>
                <span className="material-symbols-outlined text-base">visibility</span>
                打开竞赛详情
              </Button>
              <Button as={Link} to={`/contests/${contestId}/scoreboard`}>
                <span className="material-symbols-outlined text-base">leaderboard</span>
                打开榜单
              </Button>
            </>
          ) : (
            <span className="rounded-full bg-surface-container-high px-4 py-2 text-sm font-medium text-on-surface-variant">
              等待创建竞赛
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">编排状态</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">{orchestrationStatus}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {contestSummary?.updated_at ? `最近保存于 ${formatDateTime(contestSummary.updated_at)}` : message}
          </p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">赛程时长</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-primary">{duration}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前赛制：{selectedRuleset.title}</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">已编排题目</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-tertiary">{contestProblems.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">来自后端真实竞赛题目数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">参赛者记录</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-secondary">{participants.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">来自后端真实参赛者记录</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="bg-gradient-to-br from-primary to-primary-container p-5 text-on-primary">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/80">本场主控台</p>
            <h2 className="mt-3 font-headline text-2xl font-semibold tracking-tight">{form.name.trim() || '尚未命名的竞赛'}</h2>
            <p className="mt-3 text-sm leading-6 text-on-primary/80">
              参考内部编排台的工作方式，先锁定赛程，再推进题目、名单和规则发布。
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-on-primary/16 px-3 py-1.5 text-on-primary">{selectedRuleset.title}</span>
              <span className="rounded-full bg-on-primary/16 px-3 py-1.5 text-on-primary">
                {contestId ? `竞赛 #${contestId}` : '未生成竞赛编号'}
              </span>
            </div>
          </Card>

          <Card variant="default" className="p-4">
            <div className="px-2 pb-2">
              <p className="text-sm font-semibold text-on-surface">编排进度</p>
              <p className="mt-1 text-xs leading-5 text-on-surface-variant">统一按赛程、题目、名单、发布四段收口。</p>
            </div>
            <div className="mt-3 space-y-2">
              {STEPS.map((step) => {
                const active = activeStep === step.id
                const completed = contestId ? step.id < 2 || (step.id === 2 && contestProblems.length > 0) : false

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStepClick(step.id)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      active
                        ? 'border-primary bg-primary-container text-on-primary-container'
                        : 'border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                          active ? 'bg-on-primary-container text-on-primary-container' : 'bg-surface text-on-surface-variant',
                        )}
                      >
                        {completed ? (
                          <span className="material-symbols-outlined text-lg text-tertiary">check_circle</span>
                        ) : (
                          step.id
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{step.title}</p>
                        <p className="text-xs leading-5 opacity-80">{step.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Hero Card */}
          <Card variant="default" className="overflow-hidden bg-gradient-to-br from-primary-container/30 to-tertiary-container/30 p-0">
            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">竞赛编排流</p>
                <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-tight text-on-surface">从赛程到发布，一次收口</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                  主工作区对齐参考稿的编排台语言：左侧是进度与当前主赛，右侧是四段式编排内容。教师端当前只开放真实竞赛接口，因此名单管理保持只读预览。
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-on-surface">
                    当前阶段：{STEPS[activeStep - 1]?.title}
                  </span>
                  <span className="rounded-full bg-surface px-4 py-2 text-sm font-medium text-on-surface">
                    封榜：{form.freeze_minutes > 0 ? `${form.freeze_minutes} 分钟` : '不封榜'}
                  </span>
                </div>
              </div>
              <Card variant="surface" className="p-5">
                <p className="text-sm font-semibold text-on-surface">编排摘要</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-3">
                    <span className="text-sm text-on-surface-variant">赛程编号</span>
                    <span className="font-semibold text-on-surface">{contestId || '待生成'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-3">
                    <span className="text-sm text-on-surface-variant">计划时长</span>
                    <span className="font-semibold text-on-surface">{duration}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-surface-container-high px-4 py-3">
                    <span className="text-sm text-on-surface-variant">当前赛制</span>
                    <span className="font-semibold text-on-surface">{selectedRuleset.title}</span>
                  </div>
                </div>
              </Card>
            </div>
          </Card>

          {/* Basic Schedule */}
          <Card variant="default" className="p-6">
            <div className="mb-5">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">基础赛程</h2>
              <p className="mt-1 text-sm text-on-surface-variant">先录入竞赛基础信息，锁定归属、时间和赛制。</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">竞赛名称</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：2026 春季算法联赛"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">组织 ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.organization_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, organization_id: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">校区 ID</label>
                <Input
                  type="number"
                  min="1"
                  value={form.campus_id ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      campus_id: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="可留空"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">规则集</label>
                <Select
                  value={form.rules}
                  onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value as ContestRule }))}
                >
                  {RULESETS.map((ruleset) => (
                    <option key={ruleset.value} value={ruleset.value}>
                      {ruleset.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">开始时间</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-on-surface-variant">calendar_today</span>
                  <Input
                    aria-label="开始时间"
                    type="datetime-local"
                    value={toLocalInputValue(form.start_time)}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="pl-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">结束时间</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-base text-on-surface-variant">event</span>
                  <Input
                    aria-label="结束时间"
                    type="datetime-local"
                    value={toLocalInputValue(form.end_time)}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="pl-11"
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-on-surface">描述</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px]"
                  placeholder="说明竞赛用途、可用语言、报名要求或课堂说明。"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">封榜分钟数</label>
                <p className="text-xs text-on-surface-variant">0 表示不封榜</p>
                <Input
                  type="number"
                  min="0"
                  value={form.freeze_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, freeze_minutes: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-4">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span>赛程预览：{duration}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setMessage('当前步骤草稿已自动保存在本地浏览器。')}>
                  保存草稿
                </Button>
                <Button onClick={handleCreate} disabled={!canCreate}>
                  {createMutation.isPending ? '创建中...' : contestId ? '更新基础赛程' : '创建竞赛并进入编排'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Problem Arrangement */}
          <Card variant="default" className="p-6">
            <div className="mb-5">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">题目编排</h2>
              <p className="mt-1 text-sm text-on-surface-variant">只对真实竞赛做补题和题序调整，不在前端伪造题目实体。</p>
            </div>
            {!contestId ? (
              <EmptyState title="先创建竞赛" description="只有在竞赛创建成功后，才能向其中添加题目。" />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_160px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">题目 ID</label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="题目 ID"
                      value={problemForm.problem_id}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, problem_id: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">分值</label>
                    <Input
                      type="number"
                      min="1"
                      value={problemForm.points}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, points: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-on-surface">题序</label>
                    <Input
                      type="number"
                      min="0"
                      value={problemForm.order_index}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, order_index: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-on-surface-variant">当前题目数: {contestProblems.length}</p>
                  <Button onClick={handleAddProblem} disabled={!canAddProblem}>
                    <span className="material-symbols-outlined text-base">add</span>
                    添加题目
                  </Button>
                </div>

                {problemsQuery.isLoading ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <LoadingState message="加载竞赛题目..." />
                  </div>
                ) : contestProblems.length === 0 ? (
                  <EmptyState
                    title="当前竞赛还没有题目"
                    description="先用上面的表单补一题，再继续后续配置。"
                  />
                ) : (
                  <Card variant="surface" className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-outline-variant/10">
                        <thead className="bg-surface-container-low">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">题目</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">标题</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">分值</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">题序</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {contestProblems.map((problem) => (
                            <tr key={problem.id} className="transition-colors hover:bg-surface-container-low/30">
                              <td className="px-5 py-4 text-sm font-medium text-on-surface">#{problem.problem_id}</td>
                              <td className="px-5 py-4 text-sm text-on-surface">
                                <p className="font-medium">{problem.title || '未命名题目'}</p>
                                <p className="mt-1 text-xs text-on-surface-variant">{problem.difficulty || '暂未标注难度'}</p>
                              </td>
                              <td className="px-5 py-4 text-sm text-on-surface">{problem.points}</td>
                              <td className="px-5 py-4 text-sm text-on-surface">{problem.order_index}</td>
                              <td className="px-5 py-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeProblemMutation.mutate(problem.problem_id)}
                                  disabled={removeProblemMutation.isPending}
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                  移除
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </Card>

          {/* Participants Preview */}
          <Card variant="default" className="p-6">
            <div className="mb-5">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">参赛者预览</h2>
              <p className="mt-1 text-sm text-on-surface-variant">这里只做只读预览，教师端暂未开放批量导入或指派参赛者接口。</p>
            </div>
            {!contestId ? (
              <EmptyState title="先创建竞赛" description="竞赛创建成功后，这里会拉取真实参赛者列表。" />
            ) : participantsQuery.isLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <LoadingState message="加载参赛者..." />
              </div>
            ) : participants.length === 0 ? (
              <EmptyState
                title="教师端直接管理未开放"
                description="后端已有参赛者接口，但教师端没有批量邀请或指派入口，当前只保留只读预览。"
              />
            ) : (
              <Card variant="surface" className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-outline-variant/10">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">用户 ID</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">报名时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {participants.map((participant) => (
                        <tr key={participant.id}>
                          <td className="px-5 py-4 font-mono text-sm text-on-surface">{participant.user_id}</td>
                          <td className="px-5 py-4 text-sm text-on-surface">{formatDateTime(participant.registered_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </Card>

          {/* Rules & Publishing */}
          <Card variant="default" className="p-6">
            <div className="mb-5">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">规则与发布</h2>
              <p className="mt-1 text-sm text-on-surface-variant">保存当前竞赛规则、封榜和发布层面的说明。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="surface" className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">visibility</span>
                  可见性说明
                </div>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  当前竞赛可见性由后端接口控制，此处只展示页面层级的运行说明，不伪造不存在的权限开关。
                </p>
                <div className="mt-4 inline-flex rounded-2xl bg-surface p-1 shadow-sm">
                  <span className="rounded-2xl bg-primary px-4 py-2 text-sm font-medium text-on-primary">
                    <span className="material-symbols-outlined mr-2 align-middle text-base">public</span>
                    公开赛
                  </span>
                  <span className="rounded-2xl px-4 py-2 text-sm font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined mr-2 align-middle text-base">lock</span>
                    私有赛
                  </span>
                </div>
              </Card>

              <Card variant="surface" className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">verified_user</span>
                  发布策略
                </div>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  保存会调用真实的竞赛更新接口，包含名称、描述、规则、时间和封榜分钟数。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setMessage('设置区只保存后端已支持的规则与封榜字段。')}
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    刷新说明
                  </Button>
                  <Button onClick={handleSaveSettings} disabled={!canUpdate}>
                    {updateMutation.isPending ? '保存中...' : '保存设置'}
                  </Button>
                </div>
              </Card>
            </div>
          </Card>

          {/* Notes */}
          <Card variant="default" className="p-6">
            <div className="mb-5">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">编排说明</h2>
              <p className="mt-1 text-sm text-on-surface-variant">当前编排台的真实能力边界。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="surface" className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">description</span>
                  当前状态
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  <li>竞赛创建后自动进入补题阶段。</li>
                  <li>题目列表和参赛者列表都来自真实接口。</li>
                  <li>保存设置会回写后端，不做前端假缓存。</li>
                </ul>
              </Card>

              <Card variant="surface" className="p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <span className="material-symbols-outlined text-lg text-primary">person_off</span>
                  受限能力
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  <li>教师端暂未提供批量参赛者指派入口。</li>
                  <li>私有赛开关仍由后端和权限策略决定。</li>
                  <li>题目列表当前只维护竞赛关联，不修改题目本体。</li>
                </ul>
              </Card>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4">
            <p className="text-sm text-on-surface-variant">当前步骤：{activeStep} / {STEPS.length}</p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setActiveStep((current) => Math.max(1, current - 1))}
                disabled={activeStep <= 1}
              >
                上一步
              </Button>
              <Button
                onClick={() => setActiveStep((current) => Math.min(STEPS.length, current + 1))}
                disabled={!contestId || activeStep >= STEPS.length}
              >
                下一步
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
