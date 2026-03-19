import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Play, Save, Shield, SlidersHorizontal } from 'lucide-react'
import { plagiarismService, type SimilarityScanConfig } from '@/services/plagiarism'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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

  const stats = effectiveForm
    ? {
        threshold: Math.round(effectiveForm.threshold * 100),
        enabled: effectiveForm.enabled,
        ignoreComments: effectiveForm.ignore_comments,
        ignoreWhitespace: effectiveForm.ignore_whitespace,
      }
    : null

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loading message="加载扫描配置中..." />
      </div>
    )
  }

  if (error || !effectiveForm) {
    return (
      <EmptyState
        title="扫描配置加载失败"
        description="当前无法读取相似度扫描配置。"
        action={<Button onClick={() => refetch()}>重试</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Workspace"
        breadcrumb={['Tools', 'Code Similarity']}
        title="相似度扫描配置"
        description="扫描配置页已按 reference 收拢。当前功能范围保持真实接口：配置阈值、语言范围、忽略策略，并触发新的扫描任务。"
        actions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveMutation.mutate(effectiveForm)}
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              保存配置
            </Button>
            <Button
              type="button"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || (!contestId && !assignmentId)}
            >
              <Play className="h-4 w-4" />
              开始扫描
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Enabled" value={stats?.enabled ? 'On' : 'Off'} helper="是否启用扫描" />
        <StatCard label="Threshold" value={`${stats?.threshold ?? 0}%`} helper="当前相似度阈值" />
        <StatCard label="Ignore Comments" value={stats?.ignoreComments ? 'Yes' : 'No'} helper="是否忽略注释" />
        <StatCard label="Ignore Whitespace" value={stats?.ignoreWhitespace ? 'Yes' : 'No'} helper="是否忽略空白" />
      </section>

      <SurfaceCard className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-base font-semibold text-slate-950">真实相似度接口</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              当前系统使用真实相似度接口，未再保留 mock fallback。只有 contest / assignment 级别的扫描入口，尚未扩展更复杂批处理策略。
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <SurfaceCard>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <SlidersHorizontal className="h-5 w-5 text-slate-700" />
            Detection Settings
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div>
                <div className="font-medium text-slate-950">Enabled</div>
                <div className="text-xs text-slate-500">启用扫描</div>
              </div>
              <input
                type="checkbox"
                checked={effectiveForm.enabled}
                onChange={(e) => patchForm((prev) => ({ ...prev, enabled: e.target.checked }))}
              />
            </label>
            <FieldGroup label="Language">
              <select
                value={effectiveForm.language}
                onChange={(e) => patchForm((prev) => ({ ...prev, language: e.target.value as SimilarityScanConfig['language'] }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">all</option>
                <option value="cpp">cpp</option>
                <option value="c">c</option>
                <option value="java">java</option>
                <option value="python">python</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Similarity Threshold">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={effectiveForm.threshold}
                onChange={(e) => patchForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="Min Token Length">
              <Input
                type="number"
                min="1"
                value={effectiveForm.min_token_length}
                onChange={(e) => patchForm((prev) => ({ ...prev, min_token_length: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="Window Size">
              <Input
                type="number"
                min="1"
                value={effectiveForm.window_size}
                onChange={(e) => patchForm((prev) => ({ ...prev, window_size: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="Max Reports Per Run">
              <Input
                type="number"
                min="1"
                value={effectiveForm.max_reports_per_run}
                onChange={(e) => patchForm((prev) => ({ ...prev, max_reports_per_run: Number(e.target.value) }))}
              />
            </FieldGroup>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={effectiveForm.ignore_comments}
                onChange={(e) => patchForm((prev) => ({ ...prev, ignore_comments: e.target.checked }))}
              />
              忽略注释
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={effectiveForm.ignore_whitespace}
                onChange={(e) => patchForm((prev) => ({ ...prev, ignore_whitespace: e.target.checked }))}
              />
              忽略空白
            </label>
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <SlidersHorizontal className="h-4 w-4 text-violet-700" />
              Run Scan
            </div>
            <div className="mt-4 space-y-4">
              <FieldGroup label="Contest ID">
                <Input value={contestId} onChange={(e) => setContestId(e.target.value.trim())} />
              </FieldGroup>
              <FieldGroup label="Assignment ID">
                <Input value={assignmentId} onChange={(e) => setAssignmentId(e.target.value.trim())} />
              </FieldGroup>
            </div>
          </SurfaceCard>

          <SurfaceCard className="border-slate-200 bg-slate-900 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Current Signal</div>
            <div className="mt-4 text-3xl font-semibold">{stats?.threshold ?? 0}%</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              当前阈值下，超过该相似度的提交对会进入报告列表等待人工复核。
            </p>
          </SurfaceCard>

          {message ? (
            <SurfaceCard>
              <div className="text-sm text-slate-700">{message}</div>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
