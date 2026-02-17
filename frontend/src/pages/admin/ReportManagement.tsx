import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  blog: { label: '博客', icon: 'article', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  comment: { label: '评论', icon: 'chat_bubble', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  discussion: { label: '讨论', icon: 'forum', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  user: { label: '用户', icon: 'person', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

const REASON_CONFIG = {
  spam: { label: '垃圾信息', color: 'bg-yellow-100 text-yellow-700' },
  inappropriate: { label: '不当内容', color: 'bg-red-100 text-red-700' },
  copyright: { label: '版权问题', color: 'bg-purple-100 text-purple-700' },
  other: { label: '其他', color: 'bg-slate-100 text-slate-700' },
}

const STATUS_CONFIG = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  reviewing: { label: '处理中', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  dismissed: { label: '已驳回', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
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
    queryFn: () => adminService.getReports({
      type: type === 'all' ? undefined : type,
      status: status === 'all' ? undefined : status,
      page,
      limit: 20,
    }),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status, notes }: { reportId: string; status: 'reviewing' | 'resolved' | 'dismissed'; notes?: string }) =>
      adminService.updateReportStatus(reportId, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] })
      setSelectedReport(null)
      setResolutionNotes('')
    },
  })

  if (isLoading) return <Loading message="加载中..." />
  if (error) return <div className="text-center py-12">加载失败</div>

  const reports = data?.reports || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  const handleStatusUpdate = (reportId: string, newStatus: 'reviewing' | 'resolved' | 'dismissed') => {
    if (newStatus === 'reviewing') {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">举报管理</h1>
          <p className="text-sm text-slate-600">处理用户举报和内容审核</p>
        </div>
        {status === 'pending' && (
          <div className="text-sm text-red-600 font-medium">
            {total} 个待处理举报
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border p-4">
        <div className="flex gap-4 items-center">
          <span className="text-sm text-slate-600">类型：</span>
          <div className="flex gap-2">
            <button
              onClick={() => setType('all')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                type === 'all' ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
              )}
            >
              全部
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setType(key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1',
                  type === key ? 'bg-primary text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
                )}
              >
                <span className="material-symbols-outlined text-sm">{config.icon}</span>
                {config.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          <span className="text-sm text-slate-600">状态：</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="pending">待处理</option>
            <option value="reviewing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="dismissed">已驳回</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.map((report) => {
          const typeConfig = TYPE_CONFIG[report.type]
          const reasonConfig = REASON_CONFIG[report.reason]
          const statusConfig = STATUS_CONFIG[report.status]

          return (
            <div key={report.id} className="bg-white dark:bg-slate-900 rounded-xl border p-6">
              <div className="flex gap-4">
                {/* Type Icon */}
                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', typeConfig.color)}>
                  <span className="material-symbols-outlined text-2xl">{typeConfig.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', typeConfig.color)}>
                          {typeConfig.label}
                        </span>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', reasonConfig.color)}>
                          {reasonConfig.label}
                        </span>
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                      </div>

                      {report.target_title && (
                        <h3 className="font-semibold text-lg mb-1">{report.target_title}</h3>
                      )}

                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                        举报理由：{report.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>举报人：{report.reporter_username}</span>
                        <span>•</span>
                        <span>{new Date(report.created_at).toLocaleString('zh-CN')}</span>
                        {report.reviewer_username && (
                          <>
                            <span>•</span>
                            <span>处理人：{report.reviewer_username}</span>
                          </>
                        )}
                      </div>

                      {report.resolution_notes && (
                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            <span className="font-medium">处理备注：</span>
                            {report.resolution_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {report.status === 'pending' || report.status === 'reviewing' ? (
                    <div className="flex gap-2 mt-4">
                      {report.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusUpdate(report.id, 'reviewing')}
                          disabled={updateStatusMutation.isPending}
                        >
                          <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                          开始处理
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(report.id, 'resolved')}
                        disabled={updateStatusMutation.isPending}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">check</span>
                        确认违规
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({
                          reportId: report.id,
                          status: 'dismissed',
                        })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">close</span>
                        驳回举报
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 mt-2">
                      {report.status === 'resolved' ? '✓ 已处理' : '✗ 已驳回'}
                    </div>
                  )}
                </div>
              </div>

              {/* Resolution Notes Modal */}
              {selectedReport === report.id && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <label className="block text-sm font-medium mb-2">处理备注</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="请输入处理说明..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg resize-none"
                  />
                  <div className="flex gap-2 mt-3">
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
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">check_circle</span>
          <p className="text-lg font-semibold text-slate-900 dark:text-white mb-2">没有举报</p>
          <p className="text-sm text-slate-600">当前筛选条件下没有需要处理的举报</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <span className="px-4 py-2 text-sm text-slate-600">
            第 {page} / {totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
