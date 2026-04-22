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
            <Button variant="primary">浏览题目</Button>
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
    <div className="space-y-4">
      {/* Header — Supabase developer-tool aesthetic */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                提交历史
              </h1>
              <span className="rounded-full bg-[#3ecf8e]/10 px-2.5 py-1 text-xs font-medium text-[#3ecf8e]">
                {data.total} 条记录
              </span>
            </div>
            <p className="text-sm font-normal text-muted-foreground">
              查看最近的提交状态、运行表现和语言分布。已通过 {acceptedCount} 条。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="border border-border rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">通过</p>
              <p className="text-lg font-semibold tabular-nums text-[#3ecf8e]">{acceptedCount}</p>
            </div>
            <div className="border border-border rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">平均耗时</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{Math.round(averageRuntime)}ms</p>
            </div>
            <div className="border border-border rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">平均内存</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{Math.round(averageMemory / 1024)}MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar — compact, border-defined */}
      <div className="bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              状态
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handleStatusFilter('all')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  statusFilter === 'all'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                全部
              </button>
              <button
                onClick={() => handleStatusFilter('accepted')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  statusFilter === 'accepted'
                    ? 'bg-[#3ecf8e]/15 text-[#3ecf8e]'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                通过
              </button>
              <button
                onClick={() => handleStatusFilter('wrong_answer')}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  statusFilter === 'wrong_answer'
                    ? 'bg-red-500/10 text-red-500'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                答案错误
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-border" />

          <div className="flex items-center gap-2">
            <label htmlFor="language-filter" className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              语言
            </label>
            <select
              id="language-filter"
              value={languageFilter}
              onChange={(e) => handleLanguageFilter(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
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

      {/* Table — dense, border-defined, developer-tool feel */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  状态
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  题目
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  语言
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  运行时间
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  内存
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  提交时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.submissions.map((submission) => {
                const statusConfig = getSubmissionStatusConfig(submission.status)
                const languageConfig = LANGUAGE_CONFIG[submission.language as keyof typeof LANGUAGE_CONFIG] || {
                  label: submission.language,
                  icon: Code2,
                }
                const IconComponent = languageConfig.icon

                const statusPillClass = cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  submission.status === 'accepted'
                    ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]'
                    : submission.status === 'wrong_answer'
                      ? 'bg-red-500/10 text-red-500'
                      : submission.status === 'pending' || submission.status === 'queued'
                        ? 'bg-amber-500/10 text-amber-600'
                        : submission.status === 'time_limit_exceeded'
                          ? 'bg-orange-500/10 text-orange-500'
                          : submission.status === 'runtime_error'
                            ? 'bg-rose-500/10 text-rose-500'
                            : 'bg-muted text-muted-foreground'
                )

                return (
                  <tr
                    key={submission.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/submissions/${submission.id}`)}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className={statusPillClass}>
                        {statusConfig.icon === 'check_circle' && <CheckCircle className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'cancel' && <XCircle className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'schedule' && <Clock className="w-3.5 h-3.5" />}
                        {statusConfig.icon === 'memory' && <Cpu className="w-3.5 h-3.5" />}
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm font-medium text-foreground">
                        {submission.problem_title}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <IconComponent className="w-3.5 h-3.5" />
                        <span className="font-mono text-xs">{languageConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {submission.time_ms ? `${submission.time_ms}ms` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {submission.memory_kb ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
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
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-mono">
              {page} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一页
              </Button>
              <Button
                variant="outline"
                size="small"
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
