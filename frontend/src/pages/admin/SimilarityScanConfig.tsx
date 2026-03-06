import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { plagiarismService, type SimilarityScanConfig } from '@/services/plagiarism'
import { Loading } from '@/components/ui/Loading'

export function SimilarityScanConfig() {
  const [form, setForm] = useState<SimilarityScanConfig | null>(null)
  const [contestId, setContestId] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [message, setMessage] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-scan-config'],
    queryFn: () => plagiarismService.getScanConfig(),
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: SimilarityScanConfig) => plagiarismService.updateScanConfig(payload),
    onSuccess: () => setMessage('配置保存成功'),
    onError: () => setMessage('配置保存失败'),
  })

  const runMutation = useMutation({
    mutationFn: () =>
      plagiarismService.runScan({
        contest_id: contestId || undefined,
        assignment_id: assignmentId || undefined,
      }),
    onSuccess: (result) => setMessage(`扫描任务已提交，报告 ID: ${result.report_id}`),
    onError: () => setMessage('扫描任务提交失败'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loading message="加载扫描配置中..." />
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">扫描配置加载失败</p>
        <button type="button" onClick={() => refetch()} className="px-4 py-2 rounded bg-primary text-white">
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">代码相似度扫描配置</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">设置阈值、扫描窗口、忽略策略，并触发新的扫描任务</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">启用扫描</span>
          <div className="mt-1">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))}
            />
          </div>
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">语言范围</span>
          <select
            value={form.language}
            onChange={(e) =>
              setForm((prev) =>
                prev
                  ? { ...prev, language: e.target.value as SimilarityScanConfig['language'] }
                  : prev
              )
            }
            className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            <option value="all">all</option>
            <option value="cpp">cpp</option>
            <option value="c">c</option>
            <option value="java">java</option>
            <option value="python">python</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">相似度阈值（0-1）</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={form.threshold}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, threshold: Number(e.target.value) } : prev))}
            className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">最小 token 长度</span>
          <input
            type="number"
            min="1"
            value={form.min_token_length}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, min_token_length: Number(e.target.value) } : prev))}
            className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">窗口大小</span>
          <input
            type="number"
            min="1"
            value={form.window_size}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, window_size: Number(e.target.value) } : prev))}
            className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="text-sm">
          <span className="text-slate-600 dark:text-slate-300">单次最多报告数</span>
          <input
            type="number"
            min="1"
            value={form.max_reports_per_run}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, max_reports_per_run: Number(e.target.value) } : prev))}
            className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ignore_comments}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, ignore_comments: e.target.checked } : prev))}
          />
          <span className="text-slate-600 dark:text-slate-300">忽略注释</span>
        </label>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ignore_whitespace}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, ignore_whitespace: e.target.checked } : prev))}
          />
          <span className="text-slate-600 dark:text-slate-300">忽略空白</span>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">手动触发扫描</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">竞赛 ID（可选）</span>
            <input
              value={contestId}
              onChange={(e) => setContestId(e.target.value.trim())}
              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600 dark:text-slate-300">作业 ID（可选）</span>
            <input
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value.trim())}
              className="mt-1 w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
          className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
        >
          {saveMutation.isPending ? '保存中...' : '保存配置'}
        </button>
        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || (!contestId && !assignmentId)}
          className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          {runMutation.isPending ? '提交中...' : '触发扫描'}
        </button>
        {message && <span className="text-sm text-slate-600 dark:text-slate-300">{message}</span>}
      </div>
    </div>
  )
}
