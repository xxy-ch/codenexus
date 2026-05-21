import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { judgeQueueService } from '@/services/admin'
import { cn } from '@/lib/utils'

type TabId = 'status' | 'workers' | 'dlq'

interface JudgeStatus {
  queues: { normal_depth: number; contest_depth: number }
  active_judges: number
  total_active_judgements: number
  avg_wait_ms: number
  workers: JudgeWorker[]
}

interface JudgeWorker {
  worker_id: string
  active_judgements: string
  total_processed: string
  avg_wait_ms: string
  redis_breaker_state: string
  api_breaker_state: string
  last_seen: string
}

interface DlqEntry {
  id: string
  submission_id: string
  error_reason: string
  source_stream: string
  submitted_at: string
  failed_at: string
}

interface DlqResponse {
  items: DlqEntry[]
  count: number
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 5) return '刚刚'
  if (diffSeconds < 60) return `${diffSeconds}秒前`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天前`
}

function breakerColor(state: string): string {
  if (state === 'Closed') return 'bg-status-accepted/10 text-status-accepted'
  if (state === 'HalfOpen') return 'bg-status-tle/10 text-status-tle'
  return 'bg-destructive/10 text-destructive'
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const tabs: { id: TabId; label: string }[] = [
  { id: 'status', label: '队列状态' },
  { id: 'workers', label: 'Worker 节点' },
  { id: 'dlq', label: '死信队列' },
]

export function JudgeQueue() {
  const [activeTab, setActiveTab] = useState<TabId>('status')
  const queryClient = useQueryClient()

  const statusQuery = useQuery<JudgeStatus>({
    queryKey: ['judge-status'],
    queryFn: () => judgeQueueService.getStatus(),
    refetchInterval: 10_000,
  })

  const dlqQuery = useQuery<DlqResponse>({
    queryKey: ['judge-dlq'],
    queryFn: () => judgeQueueService.getDlqEntries(),
    refetchInterval: 10_000,
  })

  const retryMutation = useMutation({
    mutationFn: (entryId: string) => judgeQueueService.retryDlqEntry(entryId),
    onSuccess: () => {
      toast.success('已重新投递')
      queryClient.invalidateQueries({ queryKey: ['judge-dlq'] })
    },
    onError: () => {
      toast.error('重新投递失败')
    },
  })

  const discardMutation = useMutation({
    mutationFn: (entryId: string) => judgeQueueService.deleteDlqEntry(entryId),
    onSuccess: () => {
      toast.success('已丢弃')
      queryClient.invalidateQueries({ queryKey: ['judge-dlq'] })
    },
    onError: () => {
      toast.error('丢弃失败')
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">判题队列监控</h1>
        <p className="mt-1 text-sm text-muted-foreground">实时监控判题队列状态、Worker 节点和死信队列。</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {statusQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              正在加载队列状态...
            </div>
          )}
          {statusQuery.data && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  普通队列深度
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {statusQuery.data.queues.normal_depth}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  竞赛队列深度
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {statusQuery.data.queues.contest_depth}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  平均等待时间
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {statusQuery.data.avg_wait_ms}
                  <span className="ml-1 text-base font-normal text-muted-foreground">ms</span>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    活跃 Judge
                  </div>
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-status-accepted" />
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  {statusQuery.data.active_judges}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Workers Tab */}
      {activeTab === 'workers' && (
        <div className="space-y-4">
          {statusQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              正在加载 Worker 节点...
            </div>
          )}
          {statusQuery.data && statusQuery.data.workers.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              无活跃 Worker 节点。
            </div>
          )}
          {statusQuery.data && statusQuery.data.workers.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">Worker ID</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">活跃</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">已处理</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">等待 (ms)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">Redis 熔断</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">API 熔断</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">最后心跳</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statusQuery.data.workers.map((worker) => (
                    <tr key={worker.worker_id} className="transition hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {worker.worker_id.length > 12
                          ? worker.worker_id.slice(0, 12) + '...'
                          : worker.worker_id}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {worker.active_judgements}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {worker.total_processed}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {worker.avg_wait_ms}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', breakerColor(worker.redis_breaker_state))}>
                          {worker.redis_breaker_state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', breakerColor(worker.api_breaker_state))}>
                          {worker.api_breaker_state}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatRelativeTime(worker.last_seen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dead Letters Tab */}
      {activeTab === 'dlq' && (
        <div className="space-y-4">
          {dlqQuery.isLoading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              正在加载死信队列...
            </div>
          )}
          {dlqQuery.data && dlqQuery.data.items.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              死信队列为空。
            </div>
          )}
          {dlqQuery.data && dlqQuery.data.items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">提交 ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">错误</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">来源流</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">提交时间</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">失败时间</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dlqQuery.data.items.map((entry) => (
                    <tr key={entry.id} className="transition hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {entry.submission_id}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground" title={entry.error_reason}>
                        {entry.error_reason}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.source_stream}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(entry.submitted_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDateTime(entry.failed_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => retryMutation.mutate(entry.id)}
                            disabled={retryMutation.isPending}
                            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                          >
                            重试
                          </button>
                          <button
                            type="button"
                            onClick={() => discardMutation.mutate(entry.id)}
                            disabled={discardMutation.isPending}
                            className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/15 disabled:opacity-50"
                          >
                            丢弃
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
