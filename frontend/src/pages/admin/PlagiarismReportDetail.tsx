import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Flag } from 'lucide-react'
import { plagiarismService } from '@/services/plagiarism'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const RISK_LABELS: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const detailBlockClass = 'rounded-[20px] border border-slate-200 bg-slate-50 p-4'
const insetBlockClass = 'rounded-[20px] bg-slate-50 px-4 py-3'

export function PlagiarismReportDetail() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-detail', reportId],
    queryFn: () => plagiarismService.getReportDetail(reportId!),
    enabled: !!reportId,
  })

  const riskTone = useMemo(() => {
    const risk = data?.overall_risk?.toLowerCase()
    if (risk === 'high') return 'border-rose-200 bg-rose-50 text-rose-700'
    if (risk === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
        <Loading message="加载报告详情中..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        title="报告详情加载失败"
        description="当前无法读取真实报告详情。"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => refetch()}>重试</Button>
            <Button variant="outline" onClick={() => navigate('/admin/plagiarism-reports')}>
              返回列表
            </Button>
          </div>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理台"
        breadcrumb={['抄袭检测', '报告详情']}
        title="抄袭检测报告"
        description={`报告 ${data.id} · ${variantTone}`}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/plagiarism-reports')}>
              <ArrowLeft className="h-4 w-4" />
              返回列表
            </Button>
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]', riskTone)}>
              {RISK_LABELS[data.overall_risk?.toLowerCase()] ?? data.overall_risk}
            </span>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard label="状态" value={data.status} helper="报告处理状态" />
        <StatCard label="可疑对" value={data.suspicious_pairs} helper="可疑提交对数量" />
        <StatCard label="提交数" value={data.total_submissions} helper="扫描覆盖的提交总数" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className={detailBlockClass}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">整体风险</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {RISK_LABELS[data.overall_risk?.toLowerCase()] ?? data.overall_risk}
                </p>
              </div>
              <div className={detailBlockClass}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">比赛 / 作业</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{data.contest_id || data.assignment_id || '独立扫描'}</p>
              </div>
              <div className={detailBlockClass}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">完成时间</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-lg font-semibold text-slate-950">可疑提交对</h2>
              <p className="mt-1 text-sm text-slate-600">按相似度和匹配行数展示当前报告中的主要证据。</p>
            </div>
            <div className="divide-y divide-slate-200">
              {data.top_pairs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Flag className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-4 text-base font-semibold text-slate-900">当前报告没有可疑提交对</p>
                  <p className="mt-2 text-sm text-slate-500">这类报告应呈现为清白结论页，而不是强行渲染对比表。</p>
                </div>
              ) : (
                data.top_pairs.map((pair, index) => (
                  <div key={`${pair.left_submission_id}-${pair.right_submission_id}`} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {pair.left_user} vs {pair.right_user}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pair.left_submission_id} ↔ {pair.right_submission_id}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className={insetBlockClass}>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">左侧</p>
                          <p className="mt-1 font-mono text-xs text-slate-700">{pair.left_submission_id}</p>
                        </div>
                        <div className={insetBlockClass}>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">右侧</p>
                          <p className="mt-1 font-mono text-xs text-slate-700">{pair.right_submission_id}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className={detailBlockClass}>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">相似度</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{(pair.similarity * 100).toFixed(1)}%</p>
                      </div>
                      <div className={detailBlockClass}>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">匹配行数</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950">{pair.matched_lines}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">报告时间线</div>
            <div className="mt-4 space-y-3">
              <div className={insetBlockClass}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">创建时间</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{new Date(data.created_at).toLocaleString('zh-CN')}</p>
              </div>
              <div className={insetBlockClass}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">完成时间</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className={cn('border', riskTone)}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">交付边界</p>
                <p className="mt-2 text-sm leading-6">
                  当前详情页已经根据真实报告数据切出多种展示变体，但还没有实现源码逐段 diff 和人工判定工作流。
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
