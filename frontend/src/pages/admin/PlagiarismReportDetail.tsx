import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileSearch, Flag, Layers3, ShieldAlert } from 'lucide-react'
import { plagiarismService } from '@/services/plagiarism'
import { Loading } from '@/components/ui/Loading'
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
    if (risk === 'high') return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300'
    if (risk === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300'
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300'
  }, [data?.overall_risk])

  const variantTone = useMemo(() => {
    if (!data) return '标准报告'
    if ((data.top_pairs?.length || 0) === 0) return '清白结论页'
    if ((data.top_pairs?.length || 0) === 1) return '单对高风险页'
    if ((data.top_pairs?.length || 0) >= 3) return '多对比对页'
    return '摘要比对页'
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
      <div className="py-16 text-center">
        <p className="mb-4 text-slate-600 dark:text-slate-300">报告详情加载失败</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={() => refetch()} className="rounded bg-primary px-4 py-2 text-white">
            重试
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/plagiarism-reports')}
            className="rounded border border-slate-300 px-4 py-2 dark:border-slate-700"
          >
            返回列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.18),_transparent_35%),linear-gradient(135deg,#fff7ed_0%,#fff1f2_45%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.22),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/admin/plagiarism-reports')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back To Reports
              </button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Plagiarism Detection Report</h1>
                <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">{data.id}</p>
              </div>
              <div className={cn('inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]', riskTone)}>
                {data.overall_risk} risk · {variantTone}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{data.status}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pairs</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{data.suspicious_pairs}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Submissions</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{data.total_submissions}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-100 p-2 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Overall Risk</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{data.overall_risk}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                  <Layers3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Contest / Assignment</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{data.contest_id || data.assignment_id || '独立扫描'}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-100 p-2 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
                  <FileSearch className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Finished At</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">可疑提交对</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">按相似度和匹配行数展示当前报告中的主要证据。</p>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.top_pairs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Flag className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">当前报告没有可疑提交对</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">这类报告应呈现为清白结论页，而不是强行渲染对比表。</p>
                </div>
              ) : (
                data.top_pairs.map((pair, index) => (
                  <div key={`${pair.left_submission_id}-${pair.right_submission_id}`} className="grid gap-4 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-950 dark:text-white">{pair.left_user} vs {pair.right_user}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {pair.left_submission_id} ↔ {pair.right_submission_id}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Left</p>
                          <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">{pair.left_submission_id}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Right</p>
                          <p className="mt-1 font-mono text-xs text-slate-700 dark:text-slate-300">{pair.right_submission_id}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Similarity</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{(pair.similarity * 100).toFixed(1)}%</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Matched Lines</p>
                        <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{pair.matched_lines}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Report Timeline</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Created</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{new Date(data.created_at).toLocaleString('zh-CN')}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Finished</p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {data.finished_at ? new Date(data.finished_at).toLocaleString('zh-CN') : '未完成'}
                </p>
              </div>
            </div>
          </div>

          <div className={cn('rounded-[24px] border p-5 shadow-sm', riskTone)}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="text-sm font-semibold">交付边界</p>
                <p className="mt-2 text-sm leading-6">
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
