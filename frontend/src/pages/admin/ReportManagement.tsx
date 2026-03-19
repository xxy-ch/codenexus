import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import { ActionBar } from '@/components/page/ActionBar'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  blog: { label: '博客', icon: 'article', tone: 'bg-violet-100 text-violet-700' },
  comment: { label: '评论', icon: 'chat_bubble', tone: 'bg-sky-100 text-sky-700' },
  discussion: { label: '讨论', icon: 'forum', tone: 'bg-emerald-100 text-emerald-700' },
  user: { label: '用户', icon: 'person', tone: 'bg-amber-100 text-amber-700' },
}

const REASON_CONFIG = {
  spam: { label: '垃圾信息', tone: 'bg-amber-100 text-amber-700' },
  inappropriate: { label: '不当内容', tone: 'bg-rose-100 text-rose-700' },
  copyright: { label: '版权问题', tone: 'bg-violet-100 text-violet-700' },
  other: { label: '其他', tone: 'bg-slate-100 text-slate-700' },
}

const STATUS_CONFIG = {
  pending: { label: '待处理', tone: 'bg-amber-100 text-amber-700' },
  reviewing: { label: '处理中', tone: 'bg-sky-100 text-sky-700' },
  resolved: { label: '已解决', tone: 'bg-emerald-100 text-emerald-700' },
  dismissed: { label: '已驳回', tone: 'bg-slate-100 text-slate-700' },
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-medium', className)}>{children}</span>
}

export function ReportManagement() {
  const queryClient = useQueryClient()
  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('pending')
  const [page, setPage] = useState(1)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['adminReports', type, status, page],
    queryFn: () =>
      adminService.getReports({
        type: type === 'all' ? undefined : type,
        status: status === 'all' ? undefined : status,
        page,
        limit: 20,
      }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({
      reportId,
      status,
      notes,
    }: {
      reportId: string
      status: 'reviewing' | 'resolved' | 'dismissed'
      notes?: string
    }) => adminService.updateReportStatus(reportId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] })
      setSelectedReport(null)
      setResolutionNotes('')
    },
  })

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  const stats = useMemo(() => {
    const pending = reports.filter((report) => report.status === 'pending').length
    const reviewing = reports.filter((report) => report.status === 'reviewing').length
    const resolved = reports.filter((report) => report.status === 'resolved').length
    const dismissed = reports.filter((report) => report.status === 'dismissed').length
    return { pending, reviewing, resolved, dismissed }
  }, [reports])

  if (isLoading) return <Loading message="加载中..." />

  if (error) {
    return (
      <EmptyState
        title="举报管理加载失败"
        description="当前无法读取真实举报列表。"
        action={<Button onClick={() => queryClient.invalidateQueries({ queryKey: ['adminReports'] })}>重试</Button>}
      />
    )
  }

  const handleStatusUpdate = (reportId: string, newStatus: 'reviewing' | 'resolved' | 'dismissed') => {
    if (newStatus === 'reviewing') {
      updateStatusMutation.mutate({ reportId, status: newStatus })
    } else if (newStatus === 'dismissed') {
      updateStatusMutation.mutate({ reportId, status: newStatus })
    } else {
      setSelectedReport(reportId)
    }
  }

  const confirmStatusUpdate = () => {
    if (selectedReport) {
      updateStatusMutation.mutate({
        reportId: selectedReport,
        status: 'resolved',
        notes: resolutionNotes,
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Workspace"
        breadcrumb={['Moderation', 'Reports']}
        title="举报管理"
        description="处理用户举报和内容审核。"
        actions={
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            {status === 'pending' ? `${total} 个待处理举报` : 'Moderation queue'}
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={stats.pending} helper="待处理举报" />
        <StatCard label="Reviewing" value={stats.reviewing} helper="处理中举报" />
        <StatCard label="Resolved" value={stats.resolved} helper="已解决举报" />
        <StatCard label="Dismissed" value={stats.dismissed} helper="已驳回举报" />
      </section>

      <FilterBar>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <span className="text-sm text-slate-600">类型：</span>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={type === 'all' ? 'primary' : 'outline'}
              onClick={() => setType('all')}
            >
              全部
            </Button>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={type === key ? 'primary' : 'outline'}
                onClick={() => setType(key)}
              >
                <span className="material-symbols-outlined text-sm">{config.icon}</span>
                {config.label}
              </Button>
            ))}
          </div>
          <div className="flex-1" />
          <span className="text-sm text-slate-600">状态：</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="pending">待处理</option>
            <option value="reviewing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="dismissed">已驳回</option>
            <option value="all">全部</option>
          </select>
        </div>
      </FilterBar>

      <div className="space-y-4">
        {reports.map((report) => {
          const typeConfig = TYPE_CONFIG[report.type]
          const reasonConfig = REASON_CONFIG[report.reason]
          const statusConfig = STATUS_CONFIG[report.status]

          return (
            <SurfaceCard key={report.id}>
              <div className="flex gap-4">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', typeConfig.tone)}>
                  <span className="material-symbols-outlined text-2xl">{typeConfig.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill className={typeConfig.tone}>{typeConfig.label}</Pill>
                    <Pill className={reasonConfig.tone}>{reasonConfig.label}</Pill>
                    <Pill className={statusConfig.tone}>{statusConfig.label}</Pill>
                  </div>

                  {report.target_title ? (
                    <h3 className="mt-3 text-lg font-semibold text-slate-950">{report.target_title}</h3>
                  ) : null}

                  <p className="mt-2 text-sm leading-6 text-slate-700">举报理由：{report.description}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>举报人：{report.reporter_username}</span>
                    <span>{new Date(report.created_at).toLocaleString('zh-CN')}</span>
                    {report.reviewer_username ? <span>处理人：{report.reviewer_username}</span> : null}
                  </div>

                  {report.resolution_notes ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">处理备注：</span>
                        {report.resolution_notes}
                      </p>
                    </div>
                  ) : null}

                  {report.status === 'pending' || report.status === 'reviewing' ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {report.status === 'pending' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(report.id, 'reviewing')}
                          disabled={updateStatusMutation.isPending}
                        >
                          开始处理
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(report.id, 'resolved')}
                        disabled={updateStatusMutation.isPending}
                      >
                        确认违规
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                        disabled={updateStatusMutation.isPending}
                      >
                        驳回举报
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-500">
                      {report.status === 'resolved' ? '已处理' : '已驳回'}
                    </div>
                  )}

                  {selectedReport === report.id ? (
                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <FieldGroup label="处理备注" description="用于记录最终处理原因。">
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="请输入处理说明..."
                          rows={3}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </FieldGroup>
                      <ActionBar className="mt-4">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={confirmStatusUpdate}
                          disabled={updateStatusMutation.isPending || !resolutionNotes.trim()}
                        >
                          确认处理
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(null)
                            setResolutionNotes('')
                          }}
                        >
                          取消
                        </Button>
                      </ActionBar>
                    </div>
                  ) : null}
                </div>
              </div>
            </SurfaceCard>
          )
        })}
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="没有举报"
          description="当前筛选条件下没有需要处理的举报。"
        />
      ) : null}

      {totalPages > 1 ? (
        <ActionBar>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            第 {page} / {totalPages} 页
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
            下一页
          </Button>
        </ActionBar>
      ) : null}
    </div>
  )
}
