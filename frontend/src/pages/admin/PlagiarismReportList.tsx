import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { plagiarismService } from '@/services/plagiarism'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

const RISK_COLOR: Record<string, string> = {
  low: 'bg-status-accepted/10 text-status-accepted',
  medium: 'bg-difficulty-medium/10 text-difficulty-medium',
  high: 'bg-destructive/10 text-destructive',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-status-pending/10 text-status-pending',
  completed: 'bg-status-accepted/10 text-status-accepted',
  failed: 'bg-destructive/10 text-destructive',
}

const RISK_LABEL: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '等待中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
}

export function PlagiarismReportList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-list', page],
    queryFn: () => plagiarismService.getReports(page, limit),
  })

  if (isLoading) {
    return <TableSkeleton rows={6} columns={4} />
  }

  if (error) {
    return <InlineError title="检测报告加载失败" onRetry={() => refetch()} />
  }

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">抄袭检测报告</h1>
          <p className="text-sm text-muted-foreground">查看扫描任务结果、风险等级和可疑提交对</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">报告 ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">对象</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">提交总数</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">可疑对数</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">风险</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">创建时间</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr key={report.id} className="transition hover:bg-muted/50">
                <td className="px-4 py-3 font-mono text-xs text-foreground">{report.id}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {report.contest_id ? `contest:${report.contest_id}` : report.assignment_id ? `assignment:${report.assignment_id}` : '-'}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{report.total_submissions}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{report.suspicious_pairs}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${RISK_COLOR[report.overall_risk] || RISK_COLOR.low}`}>
                    {RISK_LABEL[report.overall_risk] || report.overall_risk}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[report.status] || STATUS_COLOR.pending}`}>
                    {STATUS_LABEL[report.status] || report.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(report.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-primary hover:underline text-xs font-medium" to={`/admin/plagiarism-reports/${report.id}`}>
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={8} className="p-0">
                  <EmptyState icon={Shield} title="暂无检测报告" description="还没有执行过代码相似度检测" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
        >
          上一页
        </button>
        <span className="text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          下一页
        </button>
      </div>
    </div>
  )
}
