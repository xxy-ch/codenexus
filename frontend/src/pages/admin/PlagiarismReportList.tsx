import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { FileSearch } from 'lucide-react'
import { plagiarismService } from '@/services/plagiarism'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const RISK_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-rose-100 text-rose-700',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  processing: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700',
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium', className)}>{children}</span>
}

const detailLinkClass =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-[rgba(193,201,224,0.36)] bg-white/92 px-4 text-sm font-semibold text-[#445472] shadow-[0_10px_24px_rgba(19,27,46,0.05)] transition-all duration-200 hover:bg-[#eef2ff] hover:text-[#17305e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dae2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--page-bg-rgb))]'

export function PlagiarismReportList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-list', page],
    queryFn: () => plagiarismService.getReports(page, limit),
  })

  const reports = useMemo(() => data?.reports ?? [], [data])
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const stats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length
    const highRisk = reports.filter((report) => report.overall_risk === 'high').length
    const completed = reports.filter((report) => report.status === 'completed').length
    const totalPairs = reports.reduce((sum, report) => sum + report.suspicious_pairs, 0)
    return { pending, highRisk, completed, totalPairs }
  }, [reports])

  const riskLabels: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loading message="加载检测报告中..." />
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="检测报告加载失败"
        description="当前无法读取真实扫描结果。"
        action={<Button onClick={() => refetch()}>重试</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理台"
        breadcrumb={['抄袭检测', '报告列表']}
        title="抄袭检测报告"
        description="查看扫描任务结果、风险等级和可疑提交对。"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            刷新
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="报告数" value={total} helper="当前页对应的报告总数" />
        <StatCard label="待处理" value={stats.pending} helper="待处理报告数量" />
        <StatCard label="高风险" value={stats.highRisk} helper="高风险报告数量" />
        <StatCard label="可疑对" value={stats.totalPairs} helper="当前页可疑对总数" />
      </section>

      <SurfaceCard className="border-slate-200 bg-slate-50">
        <div className="flex items-start gap-3">
          <FileSearch className="mt-1 h-5 w-5 text-slate-700" />
          <div>
            <h2 className="text-base font-semibold text-slate-950">扫描结果面板</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">按分页读取真实结果，风险、状态和时间戳都直接来自后端。</p>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">报告 ID</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">对象</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">提交数</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">可疑对</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">风险</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">状态</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">创建时间</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reports.map((report) => (
                <tr key={report.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-4 font-mono text-xs text-slate-700">{report.id}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {report.contest_id ? `比赛：${report.contest_id}` : report.assignment_id ? `作业：${report.assignment_id}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700">{report.total_submissions}</td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700">{report.suspicious_pairs}</td>
                  <td className="px-4 py-4">
                    <Pill className={RISK_COLOR[report.overall_risk] || RISK_COLOR.low}>
                      {riskLabels[report.overall_risk] || report.overall_risk}
                    </Pill>
                  </td>
                  <td className="px-4 py-4">
                    <Pill className={STATUS_COLOR[report.status] || STATUS_COLOR.pending}>
                      {statusLabels[report.status] || report.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {new Date(report.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link to={`/admin/plagiarism-reports/${report.id}`} className={detailLinkClass}>
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-slate-500">
                    暂无检测报告
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      {reports.length > 0 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  )
}
