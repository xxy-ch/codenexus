import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-surface-container-low text-on-surface-variant' },
  processing: { label: '处理中', className: 'bg-primary-container text-on-primary-container' },
  completed: { label: '已完成', className: 'bg-tertiary-container text-on-tertiary-fixed-variant' },
  failed: { label: '失败', className: 'bg-error-container text-on-error-container' },
}

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

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingState message="加载检测报告中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="检测报告加载失败"
          description="当前无法读取真实扫描结果"
          action={{ label: '重试', onClick: () => refetch() }}
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
            管理台 / 抄袭检测 / 报告列表
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            抄袭检测报告
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            查看扫描任务结果、风险等级和可疑提交对
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <span className="material-symbols-outlined text-base">refresh</span>
          刷新
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">报告数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{total}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前页对应的报告总数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">待处理</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{stats.pending}</p>
          <p className="mt-2 text-sm text-on-surface-variant">待处理报告数量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">高风险</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-error">{stats.highRisk}</p>
          <p className="mt-2 text-sm text-on-surface-variant">高风险报告数量</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">可疑对</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{stats.totalPairs}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前页可疑对总数</p>
        </Card>
      </div>

      {/* Info Card */}
      <Card variant="surface" className="flex items-start gap-4 p-5">
        <span className="material-symbols-outlined text-2xl text-primary">search</span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">扫描结果面板</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            按分页读取真实结果，风险、状态和时间戳都直接来自后端
          </p>
        </div>
      </Card>

      {/* Reports Table */}
      <Card variant="default" className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-outline-variant/10">
            <thead className="bg-surface-container-low/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">报告 ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">对象</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">提交数</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">可疑对</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">风险</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">状态</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">创建时间</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {reports.map((report) => (
                <tr key={report.id} className="transition-colors hover:bg-surface-container-low/30">
                  <td className="px-4 py-4 font-mono text-xs text-on-surface">{report.id}</td>
                  <td className="px-4 py-4 text-sm text-on-surface">
                    {report.contest_id ? `比赛：${report.contest_id}` : report.assignment_id ? `作业：${report.assignment_id}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-on-surface">{report.total_submissions}</td>
                  <td className="px-4 py-4 text-right text-sm text-on-surface">{report.suspicious_pairs}</td>
                  <td className="px-4 py-4">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', RISK_CONFIG[report.overall_risk]?.className ?? RISK_CONFIG.low.className)}>
                      {RISK_CONFIG[report.overall_risk]?.label ?? report.overall_risk}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', STATUS_CONFIG[report.status]?.className ?? STATUS_CONFIG.pending.className)}>
                      {STATUS_CONFIG[report.status]?.label ?? report.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">
                    {new Date(report.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/admin/plagiarism-reports/${report.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-container hover:text-on-primary-container"
                    >
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-on-surface-variant">
                    暂无检测报告
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {reports.length > 0 ? (
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-on-surface-variant">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            下一页
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default PlagiarismReportList
