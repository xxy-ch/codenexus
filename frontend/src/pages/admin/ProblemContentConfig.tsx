import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BookText, ChevronRight, Eye, Loader2, Save, Search, Timer, Waypoints } from 'lucide-react'
import { judgeConfigService, type UpdateProblemContentPayload } from '@/services/judgeConfig'
import { Loading } from '@/components/ui/Loading'

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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span>Problems</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Problem Content</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Create / Edit Problem</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  按 reference 的题面配置页重做。当前保持真实后端支持的字段范围: 标题、描述、难度、时空限制、标签与可见性。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!problemId || updateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative max-w-lg flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={problemId}
              onChange={(e) => setProblemId(e.target.value.trim())}
              placeholder="输入题目 ID"
              className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={loadProblem}
            disabled={!problemId || loading}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            加载题目
          </button>
          {(message || error) && (
            <div className={`text-sm ${message ? 'text-emerald-600' : 'text-rose-600'}`}>{message || error}</div>
          )}
        </div>
      </section>

      {loading ? (
        <div className="py-16 text-center">
          <Loading message="加载题目中..." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          <section className="space-y-6">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                  <BookText className="h-5 w-5 text-blue-600" />
                  Basic Information
                </div>
              </div>
              <div className="space-y-5 p-6">
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Problem Title</span>
                  <input
                    value={form.title || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Description</span>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-2 min-h-[360px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="输入 Markdown 题面内容"
                  />
                </label>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Waypoints className="h-4 w-4 text-emerald-600" />
                Metadata
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="text-slate-600">Difficulty</span>
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="easy">easy</option>
                    <option value="medium">medium</option>
                    <option value="hard">hard</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Tags</span>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="graph, shortest-path"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Timer className="h-4 w-4 text-amber-600" />
                Resource Limits
              </div>
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  <span className="text-slate-600">Time Limit (ms)</span>
                  <input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Memory Limit (MB)</span>
                  <input
                    type="number"
                    value={form.memory_limit || 256}
                    onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <Eye className="h-4 w-4 text-violet-600" />
                Visibility
              </div>
              <div className="mt-4 space-y-4">
                <select
                  value={form.visibility || 'private'}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="private">private</option>
                  <option value="public">public</option>
                </select>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
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
