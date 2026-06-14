import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronRight, Loader2, Play, Save, Shield, SlidersHorizontal } from 'lucide-react'
import { plagiarismService, type SimilarityScanConfig } from '@/features/admin/services/plagiarism'
import { FormSkeleton } from '@/shared/components/FormSkeleton'
import { InlineError } from '@/shared/components/InlineError'

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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>工具</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">代码相似度</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">相似度扫描配置</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              配置阈值、语言范围、忽略策略，并触发新的扫描任务。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => saveMutation.mutate(effectiveForm)}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存配置
            </button>
            <button
              type="button"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || (!contestId && !assignmentId)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              开始扫描
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="h-5 w-5 text-primary" />
              检测设置
            </div>
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <label className="text-sm">
                <span className="text-[13px] text-muted-foreground">启用</span>
                <div className="mt-2 rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3">
                  <label className="flex items-center gap-3 text-foreground">
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
                <span className="text-[13px] text-muted-foreground">语言</span>
                <select
                  value={effectiveForm.language}
                  onChange={(e) => patchForm((prev) => ({ ...prev, language: e.target.value as SimilarityScanConfig['language'] }))}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">全部</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-[13px] text-muted-foreground">相似度阈值</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={effectiveForm.threshold}
                  onChange={(e) => patchForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="text-sm">
                <span className="text-[13px] text-muted-foreground">最小 Token 长度</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.min_token_length}
                  onChange={(e) => patchForm((prev) => ({ ...prev, min_token_length: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="text-sm">
                <span className="text-[13px] text-muted-foreground">窗口大小</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.window_size}
                  onChange={(e) => patchForm((prev) => ({ ...prev, window_size: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="text-sm">
                <span className="text-[13px] text-muted-foreground">每次最大报告数</span>
                <input
                  type="number"
                  min="1"
                  value={effectiveForm.max_reports_per_run}
                  onChange={(e) => patchForm((prev) => ({ ...prev, max_reports_per_run: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={effectiveForm.ignore_comments}
                  onChange={(e) => patchForm((prev) => ({ ...prev, ignore_comments: e.target.checked }))}
                />
                忽略注释
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={effectiveForm.ignore_whitespace}
                  onChange={(e) => patchForm((prev) => ({ ...prev, ignore_whitespace: e.target.checked }))}
                />
                忽略空白
              </label>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4 text-status-re" />
              发起扫描
            </div>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="text-[13px] text-muted-foreground">竞赛 ID</span>
                <input
                  value={contestId}
                  onChange={(e) => setContestId(e.target.value.trim())}
                  className="mt-1 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block text-sm">
                <span className="text-[13px] text-muted-foreground">作业 ID</span>
                <input
                  value={assignmentId}
                  onChange={(e) => setAssignmentId(e.target.value.trim())}
                  className="mt-1 w-full rounded-lg border border-border/40 bg-background/60 backdrop-blur-xl px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-primary p-5 text-primary-foreground shadow-sm">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-primary-foreground/60">当前阈值</div>
            <div className="mt-4 text-2xl font-bold">{Math.round(effectiveForm.threshold * 100)}%</div>
            <p className="mt-2 text-[13px] leading-6 text-primary-foreground/70">
              超过该相似度的提交对会进入报告列表等待人工复核。
            </p>
          </div>

          {message && (
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 text-sm text-muted-foreground shadow-sm">
              {message}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
