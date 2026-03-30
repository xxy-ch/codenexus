import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { plagiarismService, type SimilarityScanConfig } from '@/services/plagiarism'
import { cn } from '@/lib/utils'

interface ToggleTileProps {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}

function ToggleTile({ label, description, checked, onToggle }: ToggleTileProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        checked
          ? 'border-primary-container bg-primary-container/30 text-on-primary-container'
          : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
      )}
    >
      <div>
        <div className="font-semibold text-on-surface">{label}</div>
        <div className="text-xs text-on-surface-variant">{description}</div>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
          checked ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
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
        <LoadingState message="加载扫描配置中..." />
      </div>
    )
  }

  if (error || !effectiveForm) {
    return (
      <EmptyState
        title="扫描配置加载失败"
        description="当前无法读取相似度扫描配置"
        action={{ label: '重试', onClick: () => refetch() }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 工具箱 / 代码相似度
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            相似度扫描配置
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            扫描配置页已收敛为统一表单布局。当前功能范围保持真实接口：配置阈值、语言范围、忽略策略，并触发新的扫描任务。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate(effectiveForm)}
            disabled={saveMutation.isPending}
          >
            <span className="material-symbols-outlined text-base">save</span>
            保存配置
          </Button>
          <Button
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || (!contestId && !assignmentId)}
          >
            <span className="material-symbols-outlined text-base">{runMutation.isPending ? 'hourglass_empty' : 'play_arrow'}</span>
            开始扫描
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">启用状态</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats?.enabled ? '开启' : '关闭'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">是否启用扫描</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">阈值</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{stats?.threshold ?? 0}%</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前相似度阈值</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">忽略注释</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats?.ignoreComments ? '是' : '否'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">是否忽略注释</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">忽略空白</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats?.ignoreWhitespace ? '是' : '否'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">是否忽略空白</p>
        </Card>
      </div>

      {/* Info Card */}
      <Card variant="surface" className="flex items-start gap-4 p-5">
        <span className="material-symbols-outlined text-2xl text-tertiary">verified_user</span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">真实相似度接口</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            当前系统使用真实相似度接口，不再保留降级分支。只提供比赛和作业级别的扫描入口，暂不扩展更复杂的批处理策略。
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        {/* Settings */}
        <Card variant="default" className="p-6">
          <div className="flex items-center gap-3 text-lg font-semibold text-on-surface">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant">tune</span>
            检测设置
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <ToggleTile
              label="启用"
              description="启用扫描"
              checked={effectiveForm.enabled}
              onToggle={() => patchForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">语言</label>
              <select
                value={effectiveForm.language}
                onChange={(e) => patchForm((prev) => ({ ...prev, language: e.target.value as SimilarityScanConfig['language'] }))}
                className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">全部</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">相似度阈值</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={effectiveForm.threshold}
                onChange={(e) => patchForm((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">最小标记长度</label>
              <Input
                type="number"
                min="1"
                value={effectiveForm.min_token_length}
                onChange={(e) => patchForm((prev) => ({ ...prev, min_token_length: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">窗口大小</label>
              <Input
                type="number"
                min="1"
                value={effectiveForm.window_size}
                onChange={(e) => patchForm((prev) => ({ ...prev, window_size: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">单次最多报告数</label>
              <Input
                type="number"
                min="1"
                value={effectiveForm.max_reports_per_run}
                onChange={(e) => patchForm((prev) => ({ ...prev, max_reports_per_run: Number(e.target.value) }))}
              />
            </div>
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
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submit Scan */}
          <Card variant="default" className="p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <span className="material-symbols-outlined text-lg text-tertiary">tune</span>
              提交扫描
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">比赛 ID</label>
                <Input value={contestId} onChange={(e) => setContestId(e.target.value.trim())} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">作业 ID</label>
                <Input value={assignmentId} onChange={(e) => setAssignmentId(e.target.value.trim())} />
              </div>
            </div>
          </Card>

          {/* Current Signal Card */}
          <Card className="bg-on-surface p-5 text-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">当前信号</p>
            <p className="mt-4 font-headline text-3xl font-extrabold">{stats?.threshold ?? 0}%</p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              当前阈值下，超过该相似度的提交对会进入报告列表等待人工复核。
            </p>
          </Card>

          {/* Message */}
          {message ? (
            <Card variant="surface" className="p-4">
              <p className="text-sm text-on-surface">{message}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default SimilarityScanConfig
