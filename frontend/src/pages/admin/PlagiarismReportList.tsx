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
  'inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950'

export function PlagiarismReportList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-list', page],
    queryFn: () => plagiarismService.getReports(page, limit),
  })

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const stats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length
    const highRisk = reports.filter((report) => report.overall_risk === 'high').length
    const completed = reports.filter((report) => report.status === 'completed').length
    const totalPairs = reports.reduce((sum, report) => sum + report.suspicious_pairs, 0)
    return { pending, highRisk, completed, totalPairs }
  }, [reports])

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
        eyebrow="Admin Workspace"
        breadcrumb={['Plagiarism', 'Reports']}
        title="抄袭检测报告"
        description="查看扫描任务结果、风险等级和可疑提交对。"
        actions={
          <Button variant="outline" onClick={() => refetch()}>
            刷新
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reports" value={total} helper="当前页对应的报告总数" />
        <StatCard label="Pending" value={stats.pending} helper="待处理报告数量" />
        <StatCard label="High Risk" value={stats.highRisk} helper="高风险报告数量" />
        <StatCard label="Suspicious Pairs" value={stats.totalPairs} helper="当前页可疑对总数" />
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Report ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Object</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Submissions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pairs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reports.map((report) => (
                <tr key={report.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-4 font-mono text-xs text-slate-700">{report.id}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">
                    {report.contest_id ? `contest:${report.contest_id}` : report.assignment_id ? `assignment:${report.assignment_id}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700">{report.total_submissions}</td>
                  <td className="px-4 py-4 text-right text-sm text-slate-700">{report.suspicious_pairs}</td>
                  <td className="px-4 py-4">
                    <Pill className={RISK_COLOR[report.overall_risk] || RISK_COLOR.low}>
                      {report.overall_risk}
                    </Pill>
                  </td>
                  <td className="px-4 py-4">
                    <Pill className={STATUS_COLOR[report.status] || STATUS_COLOR.pending}>
                      {report.status}
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
