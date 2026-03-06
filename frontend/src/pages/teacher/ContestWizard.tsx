import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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

  const createMutation = useMutation({
    mutationFn: async (payload: CreateContestPayload) => {
      const response = await api.post('/contests', payload)
      return response.data
    },
    onSuccess: (data) => {
      setMessage(`创建成功，竞赛 ID: ${data.id}`)
    },
    onError: (error: any) => {
      setMessage(`创建失败: ${error?.message || 'unknown error'}`)
    },
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">竞赛创建向导</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          快速创建竞赛基础信息，后续可在竞赛详情中继续配置题目与规则
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">组织 ID</span>
            <input
              type="number"
              value={form.organization_id}
              onChange={(e) => setForm((prev) => ({ ...prev, organization_id: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">校区 ID (可选)</span>
            <input
              type="number"
              value={form.campus_id ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  campus_id: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
        </div>

        <label className="space-y-1 text-sm block">
          <span className="text-slate-600 dark:text-slate-300">竞赛名称</span>
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            required
          />
        </label>

        <label className="space-y-1 text-sm block">
          <span className="text-slate-600 dark:text-slate-300">竞赛描述</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[90px]"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">规则</span>
            <select
              value={form.rules}
              onChange={(e) => setForm((prev) => ({ ...prev, rules: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <option value="acm">ACM</option>
              <option value="ioi">IOI</option>
              <option value="education">Education</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">开始时间</span>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-600 dark:text-slate-300">结束时间</span>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </label>
        </div>

        <label className="space-y-1 text-sm block">
          <span className="text-slate-600 dark:text-slate-300">封榜分钟数</span>
          <input
            type="number"
            value={form.freeze_minutes ?? 0}
            onChange={(e) => setForm((prev) => ({ ...prev, freeze_minutes: Number(e.target.value) }))}
            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
        >
          {createMutation.isPending ? '创建中...' : '创建竞赛'}
        </button>
      </form>

      {message && (
        <div className="text-sm rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          {message}
        </div>
      )}
    </div>
  )
}

