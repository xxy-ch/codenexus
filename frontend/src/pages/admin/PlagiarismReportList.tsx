import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { plagiarismService } from '@/services/plagiarism'
import { Loading } from '@/components/ui/Loading'

const RISK_COLOR: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function PlagiarismReportList() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plagiarism-report-list', page],
    queryFn: () => plagiarismService.getReports(page, limit),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loading message="加载检测报告中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 dark:text-slate-300 mb-4">检测报告加载失败</p>
        <button type="button" onClick={() => refetch()} className="px-4 py-2 rounded bg-primary text-white">
          重试
        </button>
      </div>
    )
  }

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">抄袭检测报告</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">查看扫描任务结果、风险等级和可疑提交对</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left">报告 ID</th>
              <th className="px-4 py-3 text-left">对象</th>
              <th className="px-4 py-3 text-right">提交总数</th>
              <th className="px-4 py-3 text-right">可疑对数</th>
              <th className="px-4 py-3 text-left">风险</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">创建时间</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-3 font-mono text-xs">{report.id}</td>
                <td className="px-4 py-3">
                  {report.contest_id ? `contest:${report.contest_id}` : report.assignment_id ? `assignment:${report.assignment_id}` : '-'}
                </td>
                <td className="px-4 py-3 text-right">{report.total_submissions}</td>
                <td className="px-4 py-3 text-right">{report.suspicious_pairs}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${RISK_COLOR[report.overall_risk] || RISK_COLOR.low}`}>
                    {report.overall_risk}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[report.status] || STATUS_COLOR.pending}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(report.created_at).toLocaleString('zh-CN')}</td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-primary hover:underline" to={`/admin/plagiarism-reports/${report.id}`}>
                    查看详情
                  </Link>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center text-slate-500">暂无检测报告</td>
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
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}
