import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BookText, ChevronRight, Eye, Loader2, Save, Search, Timer, Waypoints } from 'lucide-react'
import { judgeConfigService, type UpdateProblemContentPayload } from '@/services/judgeConfig'
import { FormSkeleton } from '@/components/skeletons/FormSkeleton'

export function ProblemContentConfig() {
  const [problemId, setProblemId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
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
      tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Problems</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">题面配置</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">题面配置</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              编辑题面内容、约束、可见性与说明。当前保持真实后端支持的字段范围。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!problemId || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存修改
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative max-w-lg flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={problemId}
              onChange={(e) => setProblemId(e.target.value.trim())}
              placeholder="输入题目 ID"
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={loadProblem}
            disabled={!problemId || loading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            加载题目
          </button>
          {(message || error) && (
            <div className={`text-sm ${message ? 'text-lime-400' : 'text-rose-400'}`}>{message || error}</div>
          )}
        </div>
      </div>

      {loading ? (
        <FormSkeleton rows={3} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-6 py-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BookText className="h-4 w-4 text-blue-400" />
                  基本信息
                </div>
              </div>
              <div className="space-y-5 p-6">
                <label className="block text-sm">
                  <span className="text-xs font-medium text-muted-foreground">题目标题</span>
                  <input
                    value={form.title || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium text-muted-foreground">题目描述</span>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-2 min-h-[360px] w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="输入 Markdown 题面内容"
                  />
                </label>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Waypoints className="h-4 w-4 text-emerald-400" />
                元数据
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">难度</span>
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">标签</span>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="graph, shortest-path"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Timer className="h-4 w-4 text-amber-400" />
                资源限制
              </div>
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">时间限制 (ms)</span>
                  <input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs text-muted-foreground">内存限制 (MB)</span>
                  <input
                    type="number"
                    value={form.memory_limit || 256}
                    onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Eye className="h-4 w-4 text-violet-400" />
                可见性
              </div>
              <div className="mt-4 space-y-4">
                <select
                  value={form.visibility || 'private'}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="private">私有</option>
                  <option value="public">公开</option>
                </select>
                <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={!!form.is_public}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                  />
                  公开题目
                </label>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
