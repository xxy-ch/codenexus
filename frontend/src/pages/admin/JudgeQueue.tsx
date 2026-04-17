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

  if (diffSeconds < 5) return 'just now'
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function breakerColor(state: string): string {
  if (state === 'Closed') return 'bg-emerald-100 text-emerald-700'
  if (state === 'HalfOpen') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
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
  { id: 'status', label: 'Queue Status' },
  { id: 'workers', label: 'Workers' },
  { id: 'dlq', label: 'Dead Letters' },
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
      toast.success('DLQ entry retried successfully')
      queryClient.invalidateQueries({ queryKey: ['judge-dlq'] })
    },
    onError: () => {
      toast.error('Failed to retry DLQ entry')
    },
  })

  const discardMutation = useMutation({
    mutationFn: (entryId: string) => judgeQueueService.deleteDlqEntry(entryId),
    onSuccess: () => {
      toast.success('DLQ entry discarded')
      queryClient.invalidateQueries({ queryKey: ['judge-dlq'] })
    },
    onError: () => {
      toast.error('Failed to discard DLQ entry')
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Judge Queue
      </h1>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border bg-slate-50 p-1 dark:bg-slate-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
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
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
              Loading queue status...
            </div>
          )}
          {statusQuery.data && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border bg-white p-5 dark:bg-slate-900">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Normal Queue Depth
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {statusQuery.data.queues.normal_depth}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5 dark:bg-slate-900">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Contest Queue Depth
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {statusQuery.data.queues.contest_depth}
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5 dark:bg-slate-900">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Avg Wait Time
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {statusQuery.data.avg_wait_ms}
                  <span className="ml-1 text-base font-normal text-slate-400">ms</span>
                </div>
              </div>
              <div className="rounded-lg border bg-white p-5 dark:bg-slate-900">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active Judges
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
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
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
              Loading workers...
            </div>
          )}
          {statusQuery.data && statusQuery.data.workers.length === 0 && (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
              No active workers.
            </div>
          )}
          {statusQuery.data && statusQuery.data.workers.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Worker ID</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Active</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Processed</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Wait (ms)</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">Redis Breaker</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 dark:text-slate-300">API Breaker</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {statusQuery.data.workers.map((worker) => (
                    <tr key={worker.worker_id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {worker.worker_id.length > 12
                          ? worker.worker_id.slice(0, 12) + '...'
                          : worker.worker_id}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {worker.active_judgements}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                        {worker.total_processed}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
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
                      <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-slate-400">
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
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
              Loading dead letter queue...
            </div>
          )}
          {dlqQuery.data && dlqQuery.data.items.length === 0 && (
            <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-500 dark:bg-slate-900">
              No dead letter entries.
            </div>
          )}
          {dlqQuery.data && dlqQuery.data.items.length > 0 && (
            <div className="overflow-hidden rounded-lg border bg-white dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-800">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Submission ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Error</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Stream</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Submitted</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">Failed</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dlqQuery.data.items.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {entry.submission_id}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-700 dark:text-slate-300" title={entry.error_reason}>
                        {entry.error_reason}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {entry.source_stream}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(entry.submitted_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(entry.failed_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => retryMutation.mutate(entry.id)}
                            disabled={retryMutation.isPending}
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => discardMutation.mutate(entry.id)}
                            disabled={discardMutation.isPending}
                            className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            Discard
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
