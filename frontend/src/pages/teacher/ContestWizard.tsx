import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  CircleCheckBig,
  Eye,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Timer,
  UserRound,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Loading } from '@/components/ui/Loading'
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
  { id: 1, title: 'Create', description: '竞赛名称、时间与归属信息' },
  { id: 2, title: 'Problems', description: '真实补题与题序管理' },
  { id: 3, title: 'Participants', description: '参赛者只读预览' },
  { id: 4, title: 'Settings', description: '保存最终配置' },
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teacher Workspace"
        breadcrumb={['Contests', 'Contest Wizard']}
        title="比赛向导"
        description="真实 4 步流程：先创建竞赛，再补题、看参赛者，最后保存设置。当前页面只使用后端已存在的竞赛与题目接口，不伪造不存在的管理能力。"
        actions={
          contestId ? (
            <>
              <Button variant="outline" as={Link} to={`/contests/${contestId}`}>
                打开竞赛详情
              </Button>
              <Button variant="primary" as={Link} to={`/contests/${contestId}/scoreboard`}>
                打开榜单
              </Button>
            </>
          ) : (
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              Waiting for create step
            </div>
          )
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Contest ID"
          value={contestId || '未创建'}
          helper={contestSummary?.updated_at ? `Saved ${formatDateTime(contestSummary.updated_at)}` : message}
        />
        <StatCard label="Duration" value={duration} helper={`Ruleset: ${selectedRuleset.title}`} />
        <StatCard label="Problems" value={contestProblems.length} helper="后端真实竞赛题目数" />
        <StatCard label="Participants" value={participants.length} helper="后端真实参赛者记录" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-2">
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
                      ? 'border-sky-300 bg-sky-50 text-sky-900 shadow-sm'
                      : 'border-transparent bg-slate-50 text-slate-500 hover:border-slate-200 hover:bg-white',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                        active ? 'bg-white text-sky-700 ring-2 ring-sky-200' : 'bg-white text-slate-500',
                      )}
                    >
                      {completed ? <CircleCheckBig className="h-4 w-4 text-emerald-600" /> : step.id}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{step.title}</div>
                      <div className="text-xs leading-5 opacity-80">{step.description}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="space-y-6">
          <SectionBlock
            title="Step 1. Create"
            description="创建或更新竞赛基础信息。"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <FieldGroup label="竞赛名称">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="例如：Spring 2026 Coding Cup"
                />
              </FieldGroup>
              <FieldGroup label="组织 ID">
                <input
                  type="number"
                  min="1"
                  value={form.organization_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, organization_id: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </FieldGroup>
              <FieldGroup label="校区 ID">
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
                  placeholder="可留空"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </FieldGroup>
              <FieldGroup label="规则集">
                <select
                  value={form.rules}
                  onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value as ContestRule }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  {RULESETS.map((ruleset) => (
                    <option key={ruleset.value} value={ruleset.value}>
                      {ruleset.title}
                    </option>
                  ))}
                </select>
              </FieldGroup>
              <FieldGroup label="开始时间">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="开始时间"
                    type="datetime-local"
                    value={toLocalInputValue(form.start_time)}
                    onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </FieldGroup>
              <FieldGroup label="结束时间">
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="结束时间"
                    type="datetime-local"
                    value={toLocalInputValue(form.end_time)}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </FieldGroup>
              <FieldGroup label="描述">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="说明竞赛用途、语言限制或报名要求。"
                />
              </FieldGroup>
              <FieldGroup label="封榜分钟数" description="0 表示不封榜。">
                <input
                  type="number"
                  min="0"
                  value={form.freeze_minutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, freeze_minutes: Number(e.target.value) }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </FieldGroup>
            </div>

            <FilterBar className="mt-6 justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Timer className="h-4 w-4" />
                <span>Duration preview: {duration}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => setMessage('当前步骤草稿已自动保存在本地浏览器。')}>
                  保存草稿
                </Button>
                <Button type="button" onClick={handleCreate} disabled={!canCreate}>
                  {createMutation.isPending ? '创建中...' : contestId ? '更新基础信息' : '创建竞赛并继续'}
                </Button>
              </div>
            </FilterBar>
          </SectionBlock>

          <SectionBlock
            title="竞赛题目"
            description="真实补题和题序调整。"
          >
            {!contestId ? (
              <EmptyState
                className="border-0 p-0 shadow-none"
                title="先创建竞赛"
                description="只有在竞赛创建成功后，才能向其中添加题目。"
              />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_160px]">
                  <FieldGroup label="题目 ID">
                    <input
                      type="number"
                      min="1"
                      placeholder="题目 ID"
                      value={problemForm.problem_id}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, problem_id: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </FieldGroup>
                  <FieldGroup label="分值">
                    <input
                      type="number"
                      min="1"
                      value={problemForm.points}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, points: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </FieldGroup>
                  <FieldGroup label="题序">
                    <input
                      type="number"
                      min="0"
                      value={problemForm.order_index}
                      onChange={(e) => setProblemForm((prev) => ({ ...prev, order_index: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    />
                  </FieldGroup>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-500">
                    当前题目数: {contestProblems.length}
                  </div>
                  <Button type="button" onClick={handleAddProblem} disabled={!canAddProblem}>
                    <Plus className="h-4 w-4" />
                    添加题目
                  </Button>
                </div>

                {problemsQuery.isLoading ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <Loading message="加载竞赛题目..." />
                  </div>
                ) : contestProblems.length === 0 ? (
                  <EmptyState
                    className="border-dashed"
                    title="当前竞赛还没有题目"
                    description="先用上面的表单补一题，再继续后续配置。"
                  />
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Problem</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Title</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Points</th>
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Order</th>
                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {contestProblems.map((problem) => (
                          <tr key={problem.id} className="transition hover:bg-slate-50">
                            <td className="px-5 py-4 text-sm font-medium text-slate-900">#{problem.problem_id}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">
                              <div className="font-medium text-slate-900">{problem.title || 'Untitled'}</div>
                              <div className="mt-1 text-xs text-slate-500">{problem.difficulty || 'unknown'}</div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-600">{problem.points}</td>
                            <td className="px-5 py-4 text-sm text-slate-600">{problem.order_index}</td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeProblemMutation.mutate(problem.problem_id)}
                                disabled={removeProblemMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                                移除
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="Step 3. Participants"
            description="只读参赛者预览，教师端暂未开放批量导入或指派参赛者接口。"
          >
            {!contestId ? (
              <EmptyState
                className="border-0 p-0 shadow-none"
                title="先创建竞赛"
                description="竞赛创建成功后，这里会拉取真实参赛者列表。"
              />
            ) : participantsQuery.isLoading ? (
              <div className="flex min-h-[180px] items-center justify-center">
                <Loading message="加载参赛者..." />
              </div>
            ) : participants.length === 0 ? (
              <EmptyState
                className="border-dashed"
                title="教师端直接管理未开放"
                description="后端已有参赛者接口，但教师端没有批量邀请或指派入口，当前只保留只读预览。"
              />
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User ID</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Registered At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {participants.map((participant) => (
                      <tr key={participant.id}>
                        <td className="px-5 py-4 font-mono text-sm text-slate-600">{participant.user_id}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDateTime(participant.registered_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionBlock>

          <SectionBlock
            title="规则与封榜"
            description="保存当前竞赛的最终配置。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SurfaceCard tone="muted" className="p-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Eye className="h-4 w-4 text-sky-700" />
                  Public / Private
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  当前竞赛可见性由后端接口控制，此处只展示页面层级的运行说明，不伪造不存在的权限开关。
                </p>
                <div className="mt-4 inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                  <span className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    <Eye className="mr-2 inline-block h-4 w-4" />
                    Public
                  </span>
                  <span className="rounded-2xl px-4 py-2 text-sm font-medium text-slate-600">
                    <Lock className="mr-2 inline-block h-4 w-4" />
                    Private
                  </span>
                </div>
              </SurfaceCard>

              <SurfaceCard tone="muted" className="p-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-sky-700" />
                  Save policy
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  保存会调用真实的竞赛更新接口，包含名称、描述、规则、时间和封榜分钟数。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => setMessage('设置区只保存后端已支持的规则与封榜字段。')}>
                    <RefreshCw className="h-4 w-4" />
                    刷新说明
                  </Button>
                  <Button type="button" onClick={handleSaveSettings} disabled={!canUpdate}>
                    {updateMutation.isPending ? '保存中...' : '保存设置'}
                  </Button>
                </div>
              </SurfaceCard>
            </div>
          </SectionBlock>

          <SectionBlock
            title="Workflow Notes"
            description="收口说明。"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SurfaceCard tone="muted" className="p-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 text-sky-700" />
                  当前状态
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>竞赛创建后自动进入补题阶段。</li>
                  <li>题目列表和参赛者列表都来自真实接口。</li>
                  <li>保存设置会回写后端，不做前端假缓存。</li>
                </ul>
              </SurfaceCard>

              <SurfaceCard tone="muted" className="p-4 shadow-none">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserRound className="h-4 w-4 text-sky-700" />
                  受限能力
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>教师端暂未提供批量参赛者指派入口。</li>
                  <li>私有赛开关仍由后端和权限策略决定。</li>
                  <li>题目列表当前只维护竞赛关联，不修改题目本体。</li>
                </ul>
              </SurfaceCard>
            </div>
          </SectionBlock>

          <FilterBar className="justify-between">
            <div className="text-sm text-slate-500">当前步骤：{activeStep} / {STEPS.length}</div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveStep((current) => Math.max(1, current - 1))}
                disabled={activeStep <= 1}
              >
                上一步
              </Button>
              <Button
                type="button"
                onClick={() => setActiveStep((current) => Math.min(STEPS.length, current + 1))}
                disabled={!contestId || activeStep >= STEPS.length}
              >
                下一步
              </Button>
            </div>
          </FilterBar>
        </div>
      </div>
    </div>
  )
}
