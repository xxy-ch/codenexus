import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BookText, Eye, Loader2, Save, Search, Timer, Waypoints } from 'lucide-react'
import { judgeConfigService, type UpdateProblemContentPayload } from '@/services/judgeConfig'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const textAreaClassName =
  'min-h-[360px] w-full rounded-[18px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] py-4 text-sm text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 placeholder:text-[#93a0bb] focus-visible:border-[rgba(12,86,208,0.28)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.09)]'

const selectClassName =
  'h-[52px] w-full appearance-none rounded-[18px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] pr-12 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 focus-visible:border-[rgba(12,86,208,0.28)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.09)]'

function ToggleButton({
  checked,
  label,
  onToggle,
}: {
  checked: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.12)]',
        checked
          ? 'border-[#b2c5ff] bg-white text-[#17305e] shadow-[0_12px_24px_rgba(0,61,155,0.08)]'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      )}
    >
      <div>
        <div className="font-semibold text-slate-950">{label}</div>
        <div className="text-xs text-slate-500">{checked ? '已公开' : '仅自己可见'}</div>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
          checked ? 'bg-[#dae2ff] text-[#003d9b]' : 'bg-slate-100 text-slate-500'
        )}
      >
        {checked ? '已开启' : '已关闭'}
      </span>
    </button>
  )
}

export function ProblemContentConfig() {
  const [problemId, setProblemId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<UpdateProblemContentPayload>({
    title: '',
    description: '',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    visibility: 'private',
    tags: [],
    is_public: false,
  })
  const [tagsText, setTagsText] = useState('')

  const loadProblem = async () => {
    if (!problemId) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await judgeConfigService.getProblem(problemId)
      setForm({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        time_limit: data.time_limit,
        memory_limit: data.memory_limit,
        visibility: data.visibility,
        tags: data.tags || [],
        is_public: data.is_public,
      })
      setTagsText((data.tags || []).join(', '))
    } catch (err: any) {
      setError(err?.response?.data?.message || '题目加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMessage('')
  }, [problemId])

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProblemContentPayload) => judgeConfigService.updateProblem(problemId, payload),
    onSuccess: () => {
      setMessage('保存成功')
      setError('')
    },
    onError: (err: any) => {
      setMessage('')
      setError(err?.response?.data?.message || '保存失败')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      ...form,
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理台"
        breadcrumb={['题库管理', '题面配置']}
        title="题面配置"
        description="维护真实后端支持的题面字段：标题、描述、难度、时空限制、标签与可见性。"
        actions={
          <Button type="button" onClick={handleSave} disabled={!problemId || updateMutation.isPending}>
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存修改
          </Button>
        }
      />

      <SurfaceCard className="border-slate-200 bg-slate-50">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <FieldGroup label="题目 ID" description="输入题目 ID 后加载题面配置。">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.trim())}
                placeholder="输入题目 ID"
                className="pl-11"
              />
            </div>
          </FieldGroup>
          <Button type="button" onClick={loadProblem} disabled={!problemId || loading}>
            加载题目
          </Button>
        </div>
        {(message || error) && (
          <div className={`mt-4 text-sm ${message ? 'text-emerald-600' : 'text-rose-600'}`}>{message || error}</div>
        )}
      </SurfaceCard>

      {loading ? (
        <div className="py-16 text-center">
          <Loading message="加载题目中..." />
        </div>
      ) : !problemId ? (
        <EmptyState
          title="先输入题目 ID"
          description="题面配置页需要先定位到某个题目，再读取和维护真实内容。"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          <SurfaceCard>
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <BookText className="h-5 w-5 text-slate-700" />
              基础信息
            </div>
            <div className="mt-5 space-y-5">
              <FieldGroup label="题目标题">
                <Input
                  value={form.title || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </FieldGroup>
              <FieldGroup label="题目描述">
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className={textAreaClassName}
                  placeholder="输入 Markdown 题面内容"
                />
              </FieldGroup>
            </div>
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Waypoints className="h-4 w-4 text-emerald-700" />
                元数据
              </div>
              <div className="mt-4 space-y-4">
                <FieldGroup label="难度">
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className={selectClassName}
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="标签">
                  <Input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="图论, 最短路"
                  />
                </FieldGroup>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Timer className="h-4 w-4 text-amber-700" />
                资源限制
              </div>
              <div className="mt-4 grid gap-4">
                <FieldGroup label="时间限制（ms）">
                  <Input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                  />
                </FieldGroup>
                <FieldGroup label="内存限制（MB）">
                  <Input
                    type="number"
                    value={form.memory_limit || 256}
                    onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                  />
                </FieldGroup>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Eye className="h-4 w-4 text-violet-700" />
                可见性
              </div>
              <div className="mt-4 space-y-4">
                <FieldGroup label="可见性">
                  <select
                    value={form.visibility || 'private'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        visibility: e.target.value,
                        is_public: e.target.value === 'public',
                      }))
                    }
                    className={selectClassName}
                  >
                    <option value="private">仅自己可见</option>
                    <option value="public">公开</option>
                  </select>
                </FieldGroup>
                <ToggleButton
                  checked={!!form.is_public}
                  label="公开题目"
                  onToggle={() =>
                    setForm((prev) => ({
                      ...prev,
                      is_public: !prev.is_public,
                      visibility: !prev.is_public ? 'public' : 'private',
                    }))
                  }
                />
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}
    </div>
  )
}
