import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileSearch, Flag, Layers3, ShieldAlert } from 'lucide-react'
import { plagiarismService } from '@/services/plagiarism'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'

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
    if (risk === 'high') return 'border-rose-500/30 bg-rose-500/5 text-rose-400'
    if (risk === 'medium') return 'border-amber-500/30 bg-amber-500/5 text-amber-400'
    return 'border-lime-500/30 bg-lime-500/5 text-lime-400'
  }, [data?.overall_risk])

  const riskLabel = useMemo(() => {
    const risk = data?.overall_risk?.toLowerCase()
    if (risk === 'high') return '高风险'
    if (risk === 'medium') return '中风险'
    return '低风险'
  }, [data?.overall_risk])

  const variantTone = useMemo(() => {
    if (!data) return '标准报告'
    if ((data.top_pairs?.length || 0) === 0) return '清白结论页'
    if ((data.top_pairs?.length || 0) === 1) return '单对高风险页'
    if ((data.top_pairs?.length || 0) >= 3) return '多对比对页'
    return '摘要比对页'
  }, [data])

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (error || !data) {
    return <InlineError title="报告详情加载失败" onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="px-6 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/admin/plagiarism-reports')}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                返回报告列表
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">抄袭检测报告</h1>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{data.id}</p>
              </div>
              <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest', riskTone)}>
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  data.overall_risk === 'high' ? 'bg-rose-400' : data.overall_risk === 'medium' ? 'bg-amber-400' : 'bg-lime-400',
                )} />
                {riskLabel} / {variantTone}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">状态</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{data.status}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">可疑对</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{data.suspicious_pairs}</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">提交数</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{data.total_submissions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">总体风险</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{riskLabel}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                  <Layers3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">竞赛/作业</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{data.contest_id || data.assignment_id || '独立扫描'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                  <FileSearch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">完成时间</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Suspicious pairs */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">可疑提交对</h2>
              <p className="mt-1 text-xs text-muted-foreground">按相似度和匹配行数展示当前报告中的主要证据。</p>
            </div>
            <div className="divide-y divide-border">
              {data.top_pairs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Flag className="mx-auto h-10 w-10 text-lime-400" />
                  <p className="mt-4 text-sm font-semibold text-foreground">当前报告没有可疑提交对</p>
                  <p className="mt-2 text-xs text-muted-foreground">这类报告应呈现为清白结论页。</p>
                </div>
              ) : (
                data.top_pairs.map((pair, index) => (
                  <div key={`${pair.left_submission_id}-${pair.right_submission_id}`} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{pair.left_user} vs {pair.right_user}</p>
                          <p className="text-xs text-muted-foreground">
                            {pair.left_submission_id} / {pair.right_submission_id}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg bg-muted/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">左侧</p>
                          <p className="mt-1 font-mono text-xs text-foreground">{pair.left_submission_id}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-4 py-3">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">右侧</p>
                          <p className="mt-1 font-mono text-xs text-foreground">{pair.right_submission_id}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-lg border border-border px-4 py-3">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">相似度</p>
                        <p className="mt-1 text-lg font-bold text-foreground">{(pair.similarity * 100).toFixed(1)}%</p>
                      </div>
                      <div className="rounded-lg border border-border px-4 py-3">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">匹配行数</p>
                        <p className="mt-1 text-lg font-bold text-foreground">{pair.matched_lines}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">报告时间线</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">创建时间</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{new Date(data.created_at).toLocaleString('zh-CN')}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">完成时间</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </div>
            </div>
          </div>

          <div className={cn('rounded-xl border p-5 shadow-sm', riskTone)}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">交付边界</p>
                <p className="mt-2 text-xs leading-6">
                  当前详情页已经根据真实报告数据切出多种展示变体，但还没有实现源码逐段 diff 和人工判定工作流。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
