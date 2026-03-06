import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">题面与配置管理</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">按题目 ID 维护题目内容、难度、时空限制与可见性</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <label className="text-sm text-slate-600 dark:text-slate-300">题目 ID</label>
        <div className="mt-2 flex gap-2">
          <input
            value={problemId}
            onChange={(e) => setProblemId(e.target.value.trim())}
            placeholder="输入题目 UUID"
            className="w-full md:w-96 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={loadProblem}
            disabled={!problemId || loading}
            className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
          >
            加载
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loading message="加载题目中..." />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">标题</span>
            <input
              value={form.title || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">描述</span>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1 w-full min-h-[180px] px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">难度</span>
              <select
                value={form.difficulty || 'easy'}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">时间限制(ms)</span>
              <input
                type="number"
                value={form.time_limit || 1000}
                onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">内存限制(MB)</span>
              <input
                type="number"
                value={form.memory_limit || 256}
                onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </label>

            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">可见性</span>
              <select
                value={form.visibility || 'private'}
                onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="private">private</option>
                <option value="public">public</option>
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">标签（逗号分隔）</span>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.is_public}
              onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
            />
            公开题目
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!problemId || updateMutation.isPending}
              className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
            >
              {updateMutation.isPending ? '保存中...' : '保存配置'}
            </button>
            {message && <span className="text-sm text-green-600">{message}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </div>
  )
}
