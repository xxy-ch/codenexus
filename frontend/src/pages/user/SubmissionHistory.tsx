import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { FileText, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Cpu, Code2 } from 'lucide-react'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

const LANGUAGE_CONFIG = {
  cpp: { label: 'C++', icon: Code2 },
  java: { label: 'Java', icon: Code2 },
  python: { label: 'Python', icon: Code2 },
  javascript: { label: 'JavaScript', icon: Code2 },
  typescript: { label: 'TypeScript', icon: Code2 },
  rust: { label: 'Rust', icon: Code2 },
  go: { label: 'Go', icon: Code2 },
  csharp: { label: 'C#', icon: Code2 },
  ruby: { label: 'Ruby', icon: Code2 },
  php: { label: 'PHP', icon: Code2 },
  swift: { label: 'Swift', icon: Code2 },
  kotlin: { label: 'Kotlin', icon: Code2 },
}

export function SubmissionHistory() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const limit = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['submissions', page, statusFilter, languageFilter],
    queryFn: () =>
      problemsService.getUserSubmissions({
        page,
        limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(languageFilter !== 'all' && { language: languageFilter }),
      }),
  })

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status)
    setPage(1) // 重置到第一页
  }

  const handleLanguageFilter = (language: string) => {
    setLanguageFilter(language)
    setPage(1) // 重置到第一页
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return <TableSkeleton rows={6} columns={5} />
  }

  if (error) {
    return (
      <InlineError
        title="提交记录加载失败"
        message="无法加载提交记录，请稍后重试"
        onRetry={() => refetch()}
      />
    )
  }

  if (!data || data.submissions.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="暂无提交记录"
        description="提交代码后这里会显示你的提交历史"
        action={
          <Link to="/problems">
            <Button variant="default">浏览题目</Button>
          </Link>
        }
      />
    )
  }

  const totalPages = Math.ceil(data.total / limit)
  const acceptedCount = data.submissions.filter((submission) => submission.status === 'accepted').length
  const averageRuntime = data.submissions.reduce((sum, submission) => sum + (submission.time_ms ?? 0), 0) / Math.max(1, data.submissions.length)
  const averageMemory = data.submissions.reduce((sum, submission) => sum + (submission.memory_kb ?? 0), 0) / Math.max(1, data.submissions.length)

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background animate-fade-in-up">
      {/* Header / Summary Card */}
      <div className="glass shadow-card rounded-xl p-6 border border-border/50">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                提交历史
              </h1>
              <span className="rounded-full bg-status-accepted/10 border border-status-accepted/20 px-2.5 py-1 text-xs font-semibold text-status-accepted shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                {data.total} 条记录
              </span>
            </div>
            <p className="text-sm font-normal text-text-tertiary">
              查看最近的提交状态、运行表现和语言分布。已通过 {acceptedCount} 条。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass shadow-whisper px-4 py-2 border border-border/40 hover-lift rounded-lg text-center min-w-[80px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">通过</p>
              <p className="text-lg font-semibold tabular-nums text-status-accepted mt-0.5">{acceptedCount}</p>
            </div>
            <div className="glass shadow-whisper px-4 py-2 border border-border/40 hover-lift rounded-lg text-center min-w-[80px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">平均耗时</p>
              <p className="text-lg font-semibold tabular-nums text-foreground mt-0.5">{Math.round(averageRuntime)}ms</p>
            </div>
            <div className="glass shadow-whisper px-4 py-2 border border-border/40 hover-lift rounded-lg text-center min-w-[80px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">平均内存</p>
              <p className="text-lg font-semibold tabular-nums text-foreground mt-0.5">{Math.round(averageMemory / 1024)}MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass shadow-whisper rounded-xl px-5 py-4 border border-border/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              状态
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleStatusFilter('all')}
                className={cn(
                  'rounded-full px-3.5 py-1 text-xs font-medium transition-all button-press border',
                  statusFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary/30 shadow-whisper'
                    : 'text-text-tertiary hover:bg-white/[0.03] hover:text-foreground border-transparent'
                )}
              >
                全部
              </button>
              <button
                onClick={() => handleStatusFilter('accepted')}
                className={cn(
                  'rounded-full px-3.5 py-1 text-xs font-medium transition-all button-press border',
                  statusFilter === 'accepted'
                    ? 'bg-status-accepted/10 text-status-accepted border-status-accepted/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'text-text-tertiary hover:bg-white/[0.03] hover:text-foreground border-transparent'
                )}
              >
                通过
              </button>
              <button
                onClick={() => handleStatusFilter('wrong_answer')}
                className={cn(
                  'rounded-full px-3.5 py-1 text-xs font-medium transition-all button-press border',
                  statusFilter === 'wrong_answer'
                    ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                    : 'text-text-tertiary hover:bg-white/[0.03] hover:text-foreground border-transparent'
                )}
              >
                答案错误
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="language-filter" className="text-[11px] font-semibold uppercase tracking-widest text-text-tertiary">
              语言
            </label>
            <select
              id="language-filter"
              value={languageFilter}
              onChange={(e) => handleLanguageFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            >
              <option value="all">全部语言</option>
              {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass shadow-elevated rounded-xl overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/40 bg-white/[0.01]">
              <tr>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  状态
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  题目
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  语言
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  运行时间
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  内存
                </th>
                <th className="px-5 py-3.5 text-left text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  提交时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.submissions.map((submission) => {
                const statusConfig = getSubmissionStatusConfig(submission.status)
                const languageConfig = LANGUAGE_CONFIG[submission.language as keyof typeof LANGUAGE_CONFIG] || {
                  label: submission.language,
                  icon: Code2,
                }
                const IconComponent = languageConfig.icon

                const statusPillClass = cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
                  submission.status === 'accepted'
                    ? 'bg-status-accepted/10 text-status-accepted border-status-accepted/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : submission.status === 'wrong_answer'
                      ? 'bg-destructive/10 text-destructive border-destructive/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                      : submission.status === 'pending' || submission.status === 'queued'
                        ? 'bg-status-pending/10 text-status-pending border-status-pending/20 animate-pulse'
                        : submission.status === 'time_limit_exceeded'
                          ? 'bg-status-tle/10 text-status-tle border-status-tle/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                          : submission.status === 'runtime_error'
                            ? 'bg-status-re/10 text-status-re border-status-re/20 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
                            : 'bg-muted text-muted-foreground border-transparent'
                )

                return (
                  <tr
                    key={submission.id}
                    className="hover:bg-white/[0.03] transition-all cursor-pointer hover:translate-x-0.5 duration-150"
                    onClick={() => navigate(`/submissions/${submission.id}`)}
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className={statusPillClass}>
                        {statusConfig.icon === 'check_circle' && <CheckCircle className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'cancel' && <XCircle className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'schedule' && <Clock className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'memory' && <Cpu className="w-3.5 h-3.5" />}
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm font-medium text-foreground">
                        {submission.problem_title}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 rounded bg-white/[0.04] border border-border/30 px-2 py-0.5 text-xs text-text-secondary">
                        <IconComponent className="w-3.5 h-3.5 text-text-tertiary" />
                        <span className="font-mono text-[11px] font-medium">{languageConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm tabular-nums text-text-secondary">
                        {submission.time_ms ? `${submission.time_ms}ms` : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm tabular-nums text-text-secondary">
                        {submission.memory_kb ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-xs text-text-tertiary">
                        {new Date(submission.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-border/40 flex items-center justify-between bg-white/[0.01]">
            <span className="text-xs text-text-tertiary font-mono">
              第 <span className="font-semibold text-foreground">{page}</span> 页，共{' '}
              <span className="font-semibold text-foreground">{totalPages}</span> 页
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="glass-interactive button-press"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="glass-interactive button-press"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                下一页
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
