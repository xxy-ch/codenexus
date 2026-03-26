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
import { cn } from '@/lib/utils'

const selectClassName =
  'h-[52px] w-full appearance-none rounded-[18px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] pr-12 text-sm font-medium text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 focus-visible:border-[rgba(12,86,208,0.28)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.09)]'

function ToggleTile({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
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
        <div className="text-xs text-slate-500">{description}</div>
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
        eyebrow="管理台"
        breadcrumb={['工具箱', '代码相似度']}
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
        <StatCard label="启用状态" value={stats?.enabled ? '开启' : '关闭'} helper="是否启用扫描" />
        <StatCard label="阈值" value={`${stats?.threshold ?? 0}%`} helper="当前相似度阈值" />
        <StatCard label="忽略注释" value={stats?.ignoreComments ? '是' : '否'} helper="是否忽略注释" />
        <StatCard label="忽略空白" value={stats?.ignoreWhitespace ? '是' : '否'} helper="是否忽略空白" />
      </section>

      <SurfaceCard className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-base font-semibold text-slate-950">真实相似度接口</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              当前系统使用真实相似度接口，不再保留降级分支。只提供比赛和作业级别的扫描入口，暂不扩展更复杂的批处理策略。
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <SurfaceCard>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-950">
            <SlidersHorizontal className="h-5 w-5 text-slate-700" />
            检测设置
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ToggleTile
              label="启用"
              description="启用扫描"
              checked={effectiveForm.enabled}
              onToggle={() => patchForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
            />
            <FieldGroup label="语言">
              <select
                value={effectiveForm.language}
                onChange={(e) => patchForm((prev) => ({ ...prev, language: e.target.value as SimilarityScanConfig['language'] }))}
                className={selectClassName}
              >
                <option value="all">全部</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </FieldGroup>
            <FieldGroup label="相似度阈值">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={effectiveForm.threshold}
                onChange={(e) => patchForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="最小标记长度">
              <Input
                type="number"
                min="1"
                value={effectiveForm.min_token_length}
                onChange={(e) => patchForm((prev) => ({ ...prev, min_token_length: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="窗口大小">
              <Input
                type="number"
                min="1"
                value={effectiveForm.window_size}
                onChange={(e) => patchForm((prev) => ({ ...prev, window_size: Number(e.target.value) }))}
              />
            </FieldGroup>
            <FieldGroup label="单次最多报告数">
              <Input
                type="number"
                min="1"
                value={effectiveForm.max_reports_per_run}
                onChange={(e) => patchForm((prev) => ({ ...prev, max_reports_per_run: Number(e.target.value) }))}
              />
            </FieldGroup>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ToggleTile
              label="忽略注释"
              description="忽略注释内容"
              checked={effectiveForm.ignore_comments}
              onToggle={() => patchForm((prev) => ({ ...prev, ignore_comments: !prev.ignore_comments }))}
            />
            <ToggleTile
              label="忽略空白"
              description="忽略空白字符"
              checked={effectiveForm.ignore_whitespace}
              onToggle={() => patchForm((prev) => ({ ...prev, ignore_whitespace: !prev.ignore_whitespace }))}
            />
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <SlidersHorizontal className="h-4 w-4 text-violet-700" />
              提交扫描
            </div>
            <div className="mt-4 space-y-4">
              <FieldGroup label="比赛 ID">
                <Input value={contestId} onChange={(e) => setContestId(e.target.value.trim())} />
              </FieldGroup>
              <FieldGroup label="作业 ID">
                <Input value={assignmentId} onChange={(e) => setAssignmentId(e.target.value.trim())} />
              </FieldGroup>
            </div>
          </SurfaceCard>

          <SurfaceCard className="border-slate-200 bg-slate-900 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">当前信号</div>
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
