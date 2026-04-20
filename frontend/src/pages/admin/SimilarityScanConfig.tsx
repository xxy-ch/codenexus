import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight, Loader2, Play, Save, Shield, SlidersHorizontal } from 'lucide-react'
import { plagiarismService, type SimilarityScanConfig } from '@/services/plagiarism'
import { FormSkeleton } from '@/components/skeletons/FormSkeleton'
import { InlineError } from '@/components/ui/InlineError'

export function SimilarityScanConfig() {
  const [form, setForm] = useState<SimilarityScanConfig | null>(null)
  const [contestId, setContestId] = useState('')
  const [assignmentId, setAssignmentId] = useState('')
  const [message, setMessage] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-scan-config'],
    queryFn: () => plagiarismService.getScanConfig(),
  })

  const effectiveForm = useMemo(() => form ?? data ?? null, [form, data])

  const patchForm = (updater: (current: SimilarityScanConfig) => SimilarityScanConfig) => {
    if (!effectiveForm) return
    setForm(updater(effectiveForm))
  }

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
    return <FormSkeleton rows={3} />
  }

  if (error || !effectiveForm) {
    return <InlineError title="扫描配置加载失败" onRetry={() => refetch()} />
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
                <span>Tools</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Code Similarity</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">New Scan Configuration</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  扫描配置页已按 reference 收拢。当前功能范围保持真实接口: 配置阈值、语言范围、忽略策略，并触发新的扫描任务。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => saveMutation.mutate(effectiveForm)}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Config
              </button>
              <button
                type="button"
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending || (!contestId && !assignmentId)}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start Scan
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-900">
        当前系统使用真实相似度接口，未再保留 mock fallback。只有 contest / assignment 级别的扫描入口，尚未扩展更复杂批处理策略。
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
              <Shield className="h-5 w-5 text-blue-600" />
              Detection Settings
            </div>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-slate-600">Enabled</span>
                <div className="mt-2 rounded-2xl border border-slate-200 px-4 py-3">
                  <label className="flex items-center gap-3 text-slate-700">
                    <input
                      type="checkbox"
                      checked={effectiveForm.enabled}
                      onChange={(e) => patchForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                    />
                    启用扫描
                  </label>
                </div>
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Language</span>
                <select
                  value={effectiveForm.language}
                  onChange={(e) => patchForm((prev) => ({ ...prev, language: e.target.value as SimilarityScanConfig['language'] }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">all</option>
                  <option value="cpp">cpp</option>
                  <option value="c">c</option>
                  <option value="java">java</option>
                  <option value="python">python</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Similarity Threshold</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={effectiveForm.threshold}
                  onChange={(e) => patchForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Min Token Length</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.min_token_length}
                  onChange={(e) => patchForm((prev) => ({ ...prev, min_token_length: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Window Size</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.window_size}
                  onChange={(e) => patchForm((prev) => ({ ...prev, window_size: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="text-sm">
                <span className="text-slate-600">Max Reports Per Run</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.max_reports_per_run}
                  onChange={(e) => patchForm((prev) => ({ ...prev, max_reports_per_run: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={effectiveForm.ignore_comments}
                  onChange={(e) => patchForm((prev) => ({ ...prev, ignore_comments: e.target.checked }))}
                />
                忽略注释
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={effectiveForm.ignore_whitespace}
                  onChange={(e) => patchForm((prev) => ({ ...prev, ignore_whitespace: e.target.checked }))}
                />
                忽略空白
              </label>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <SlidersHorizontal className="h-4 w-4 text-violet-600" />
              Run Scan
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="text-slate-600">Contest ID</span>
                <input
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value.trim())}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Assignment ID</span>
                <input
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value.trim())}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-900 p-6 text-white shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Current Signal</div>
            <div className="mt-4 text-2xl font-semibold">{Math.round(effectiveForm.threshold * 100)}%</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              当前阈值下，超过该相似度的提交对会进入报告列表等待人工复核。
            </p>
          </div>

          {message && (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
              {message}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
