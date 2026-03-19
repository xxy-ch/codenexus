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
        eyebrow="Admin Workspace"
        breadcrumb={['Problems', 'Problem Content']}
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
                  className="min-h-[360px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="输入 Markdown 题面内容"
                />
              </FieldGroup>
            </div>
          </SurfaceCard>

          <div className="space-y-6">
            <SurfaceCard>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Waypoints className="h-4 w-4 text-emerald-700" />
                Metadata
              </div>
              <div className="mt-4 space-y-4">
                <FieldGroup label="Difficulty">
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </FieldGroup>
                <FieldGroup label="Tags">
                  <Input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="graph, shortest-path"
                  />
                </FieldGroup>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Timer className="h-4 w-4 text-amber-700" />
                Resource Limits
              </div>
              <div className="mt-4 grid gap-4">
                <FieldGroup label="Time Limit (ms)">
                  <Input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                  />
                </FieldGroup>
                <FieldGroup label="Memory Limit (MB)">
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
                Visibility
              </div>
              <div className="mt-4 space-y-4">
                <FieldGroup label="Visibility">
                  <select
                    value={form.visibility || 'private'}
                    onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="private">private</option>
                    <option value="public">public</option>
                  </select>
                </FieldGroup>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!form.is_public}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                  />
                  公开题目
                </label>
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}
    </div>
  )
}
