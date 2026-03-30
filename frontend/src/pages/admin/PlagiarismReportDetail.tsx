import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { plagiarismService } from '@/services/plagiarism'
import { cn } from '@/lib/utils'

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: '低风险', className: 'bg-tertiary-container text-on-tertiary-fixed-variant' },
  medium: { label: '中风险', className: 'bg-secondary-container text-on-secondary-container' },
  high: { label: '高风险', className: 'bg-error-container text-on-error-container' },
}

export function PlagiarismReportDetail() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-detail', reportId],
    queryFn: () => plagiarismService.getReportDetail(reportId!),
    enabled: !!reportId,
  })

  const riskConfig = useMemo(() => {
    const risk = data?.overall_risk?.toLowerCase()
    return RISK_CONFIG[risk || ''] ?? RISK_CONFIG.low
  }, [data?.overall_risk])

  const variantTone = useMemo(() => {
    if (!data) return '标准报告'
    if ((data.top_pairs?.length || 0) === 0) return '暂无可疑对'
    if ((data.top_pairs?.length || 0) === 1) return '单对重点复核'
    if ((data.top_pairs?.length || 0) >= 3) return '多对重点复核'
    return '摘要复核'
  }, [data])

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingState message="加载报告详情中..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="报告详情加载失败"
          description="当前无法读取真实报告详情"
          action={{
            label: '重试',
            onClick: () => refetch(),
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 抄袭检测 / 报告详情
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            抄袭检测报告
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            报告 {data.id} · {variantTone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/plagiarism-reports')}>
            <span className="material-symbols-outlined text-base">arrow_back</span>
            返回列表
          </Button>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider', riskConfig.className)}>
            {riskConfig.label}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">状态</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">{data.status}</p>
          <p className="mt-2 text-sm text-on-surface-variant">报告处理状态</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">可疑对</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-primary">{data.suspicious_pairs}</p>
          <p className="mt-2 text-sm text-on-surface-variant">可疑提交对数量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">提交数</p>
          <p className="mt-4 font-headline text-2xl font-extrabold text-tertiary">{data.total_submissions}</p>
          <p className="mt-2 text-sm text-on-surface-variant">扫描覆盖的提交总数</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Info Cards */}
          <Card variant="default" className="p-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card variant="surface" className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">整体风险</p>
                <p className="mt-2 text-lg font-semibold text-on-surface">{riskConfig.label}</p>
              </Card>
              <Card variant="surface" className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">比赛 / 作业</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">{data.contest_id || data.assignment_id || '独立扫描'}</p>
              </Card>
              <Card variant="surface" className="p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">完成时间</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </Card>
            </div>
          </Card>

          {/* Pairs List */}
          <Card variant="default" className="overflow-hidden p-0">
            <div className="border-b border-outline-variant/10 px-6 py-4">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">可疑提交对</h2>
              <p className="mt-1 text-sm text-on-surface-variant">按相似度和匹配行数展示当前报告中的主要证据</p>
            </div>
            <div className="divide-y divide-outline-variant/10">
              {data.top_pairs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <span className="material-symbols-outlined mx-auto text-5xl text-tertiary">check_circle</span>
                  <p className="mt-4 text-base font-semibold text-on-surface">当前报告没有可疑提交对</p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    这类报告应呈现为清白结论页，而不是强行渲染对比表
                  </p>
                </div>
              ) : (
                data.top_pairs.map((pair, index) => (
                  <div key={`${pair.left_submission_id}-${pair.right_submission_id}`} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-surface">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">
                            {pair.left_user} vs {pair.right_user}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {pair.left_submission_id} ↔ {pair.right_submission_id}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Card variant="surface" className="p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">左侧</p>
                          <p className="mt-1 font-mono text-xs text-on-surface">{pair.left_submission_id}</p>
                        </Card>
                        <Card variant="surface" className="p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">右侧</p>
                          <p className="mt-1 font-mono text-xs text-on-surface">{pair.right_submission_id}</p>
                        </Card>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <Card variant="surface" className="p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">相似度</p>
                        <p className="mt-1 text-lg font-semibold text-on-surface">{(pair.similarity * 100).toFixed(1)}%</p>
                      </Card>
                      <Card variant="surface" className="p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">匹配行数</p>
                        <p className="mt-1 text-lg font-semibold text-on-surface">{pair.matched_lines}</p>
                      </Card>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card variant="default" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">报告时间线</p>
            <div className="mt-4 space-y-3">
              <Card variant="surface" className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">创建时间</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{new Date(data.created_at).toLocaleString('zh-CN')}</p>
              </Card>
              <Card variant="surface" className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">完成时间</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </Card>
            </div>
          </Card>

          {/* Delivery Boundary */}
          <Card variant="surface" className={cn('border', riskConfig.className)}>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-xl">info</span>
              <div>
                <p className="text-sm font-semibold">交付边界</p>
                <p className="mt-2 text-sm leading-6">
                  当前详情页已经根据真实报告数据切出多种展示变体，但还没有实现源码逐段 diff 和人工判定工作流。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PlagiarismReportDetail
