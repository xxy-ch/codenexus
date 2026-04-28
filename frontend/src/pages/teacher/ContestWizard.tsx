import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CalendarDays, ChevronRight, Eye, FileText, Globe2, Lock, ShieldCheck, Timer, Trophy } from 'lucide-react'
import api from '@/services/api'

interface CreateContestPayload {
  organization_id: number
  campus_id?: number
  name: string
  description?: string
  rules?: string
  start_time: string
  end_time: string
  freeze_minutes?: number
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
  { id: 1, title: 'Basic Info', description: '竞赛名称、时间与组织信息' },
  { id: 2, title: 'Problems', description: '创建后在竞赛详情中继续配置题目' },
  { id: 3, title: 'Participants', description: '后续通过班级和报名页组织参赛范围' },
  { id: 4, title: 'Settings', description: '榜单冻结与可见性' },
]

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
  const [isPrivate, setIsPrivate] = useState(false)
  const [message, setMessage] = useState<string>('')

  const createMutation = useMutation({
    mutationFn: async (payload: CreateContestPayload) => {
      const response = await api.post('/contests', payload)
      return response.data
    },
    onSuccess: (data) => {
      setMessage(`创建成功，竞赛 ID: ${data.id}`)
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      start_time: toUtcIsoString(form.start_time),
      end_time: toUtcIsoString(form.end_time),
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Teacher Workspace</span>
              <ChevronRight className="h-4 w-4" />
              <span>Contests</span>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-slate-900">Create New Contest</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create New Contest</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                按参考稿的四段式向导组织创建流程。当前页只提交真实后端已支持的基础信息，其余题目与参赛者配置在创建成功后继续完成。
              </p>
            </div>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                <Timer className="h-4 w-4" />
                Duration
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-950">{durationHours}h</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                <Trophy className="h-4 w-4" />
                Ruleset
              </div>
              <div className="mt-3 text-lg font-semibold text-slate-950">{selectedRuleset.title}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-1">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`rounded-2xl border px-4 py-3 ${
                  step.id === 1
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-transparent bg-slate-50 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      step.id === 1 ? 'bg-white text-blue-700 ring-2 ring-blue-200' : 'bg-white text-slate-500'
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

        <form onSubmit={onSubmit} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="space-y-10 p-6 md:p-8">
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Basic Information</h2>
                <p className="mt-1 text-sm text-slate-600">定义竞赛的核心身份、时间窗口和归属范围。</p>
              </div>

              <div className="grid gap-5">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Contest Title</span>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="例如：Spring 2026 Coding Cup"
                    required
                  />
                </label>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Organization ID</span>
                    <input
                      type="number"
                      min="1"
                      value={form.organization_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, organization_id: Number(e.target.value) }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-700">Campus ID</span>
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
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      placeholder="可留空"
                    />
                  </label>
                </div>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Description</span>
                  <textarea
                    value={form.description ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="说明竞赛用途、允许语言或参赛须知。"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-6 border-t border-slate-200 pt-8">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Schedule</h2>
                <p className="mt-1 text-sm text-slate-600">当前后端要求 UTC 时间，页面会自动从本地输入转换后提交。</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Start Time</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={toUtcInputValue(form.start_time)}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">End Time</span>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="datetime-local"
                      value={toUtcInputValue(form.end_time)}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-6 border-t border-slate-200 pt-8">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Rule Set</h2>
                <p className="mt-1 text-sm text-slate-600">直接映射到后端 `rules` 字段，当前只保留已支持的三种模式。</p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {RULESETS.map((ruleset) => {
                  const active = form.rules === ruleset.value
                  return (
                    <button
                      key={ruleset.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, rules: ruleset.value }))}
                      className={`rounded-3xl border p-5 text-left transition ${
                        active
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">{ruleset.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">{ruleset.description}</div>
                        </div>
                        <div
                          className={`mt-1 h-4 w-4 rounded-full border ${
                            active ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-100' : 'border-slate-300 bg-white'
                          }`}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-6 border-t border-slate-200 pt-8">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Visibility & Freeze</h2>
                <p className="mt-1 text-sm text-slate-600">可见性目前作为前端运行策略展示，真实创建接口当前只提交榜单冻结分钟数。</p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      {isPrivate ? <Lock className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
                      {isPrivate ? 'Private Contest' : 'Public Contest'}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      {isPrivate
                        ? '当前只是页面层级标记。若要真正做私有赛，需要后端补权限和报名控制。'
                        : '公开赛可直接在竞赛列表中被看见，适合训练营和校内赛。'}
                    </p>
                  </div>

                  <div className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() => setIsPrivate(false)}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                        !isPrivate ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivate(true)}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                        isPrivate ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      Private
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Eye className="h-4 w-4" />
                      冻结榜单
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      提交给后端的真实控制项。填写 `0` 表示不封榜。
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={form.freeze_minutes ?? 0}
                      onChange={(e) => setForm((prev) => ({ ...prev, freeze_minutes: Number(e.target.value) }))}
                      className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      当前交付边界
                    </div>
                    <ul className="mt-3 space-y-2 leading-6 text-emerald-800">
                      <li>只提交后端已支持的创建字段。</li>
                      <li>题目、参赛者和更细的权限配置在后续页完成。</li>
                      <li>不再暴露无后端支撑的假开关。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <FileText className="h-4 w-4" />
              {message ? <span>{message}</span> : <span>创建成功后再进入题目配置、参与者管理和细节设置。</span>}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMessage('当前未实现草稿持久化，避免制造假能力。')}
                className="rounded-2xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
              >
                Save Draft
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {createMutation.isPending ? 'Publishing...' : 'Publish Contest'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
