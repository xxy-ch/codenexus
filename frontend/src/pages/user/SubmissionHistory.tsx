import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    icon: 'schedule',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: 'sync',
  },
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    icon: 'check_circle',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: 'cancel',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    icon: 'timer',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    icon: 'memory',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: 'error',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-400',
    icon: 'warning',
  },
}

const LANGUAGE_CONFIG = {
  cpp: { label: 'C++', icon: 'code' },
  java: { label: 'Java', icon: 'code' },
  python: { label: 'Python', icon: 'code' },
  javascript: { label: 'JavaScript', icon: 'javascript' },
  typescript: { label: 'TypeScript', icon: 'code' },
  rust: { label: 'Rust', icon: 'code' },
  go: { label: 'Go', icon: 'code' },
  csharp: { label: 'C#', icon: 'code' },
  ruby: { label: 'Ruby', icon: 'code' },
  php: { label: 'PHP', icon: 'code' },
  swift: { label: 'Swift', icon: 'code' },
  kotlin: { label: 'Kotlin', icon: 'code' },
}

export function SubmissionHistory() {
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          加载失败
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          无法加载提交记录，请稍后重试
        </p>
        <Button variant="primary" onClick={() => refetch()}>
          重试
        </Button>
      </div>
    )
  }

  if (!data || data.submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">
          sentiment_dissatisfied
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          暂无提交记录
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          开始解题后，您的提交记录将显示在这里
        </p>
        <Link to="/problems">
          <Button variant="primary">
            <span className="material-symbols-outlined mr-2">code</span>
            浏览题目
          </Button>
        </Link>
      </div>
    )
  }

  const totalPages = Math.ceil(data.total / limit)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            提交历史
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            共 {data.total} 条提交记录
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              状态:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleStatusFilter('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                全部
              </button>
              <button
                onClick={() => handleStatusFilter('accepted')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'accepted'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                Accepted
              </button>
              <button
                onClick={() => handleStatusFilter('wrong_answer')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  statusFilter === 'wrong_answer'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                Wrong Answer
              </button>
            </div>
          </div>

          {/* Language Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="language-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              语言:
            </label>
            <select
              id="language-filter"
              value={languageFilter}
              onChange={(e) => handleLanguageFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
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

      {/* Submissions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  题目
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  语言
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  运行时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  内存
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  提交时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {data.submissions.map((submission) => {
                const statusConfig = STATUS_CONFIG[submission.status]
                const languageConfig = LANGUAGE_CONFIG[submission.language as keyof typeof LANGUAGE_CONFIG] || {
                  label: submission.language,
                  icon: 'code',
                }

                return (
                  <tr
                    key={submission.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/submissions/${submission.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
                        statusConfig.bgColor,
                        statusConfig.textColor
                      )}>
                        <span className="material-symbols-outlined text-sm">
                          {statusConfig.icon}
                        </span>
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {submission.problem_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {languageConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {submission.time_ms ? `${submission.time_ms}ms` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-700 dark:text-slate-300">
                        {submission.memory_kb ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(submission.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              第 {page} 页，共 {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <span className="material-symbols-outlined">chevron_left</span>
                上一页
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                下一页
                <span className="material-symbols-outlined">chevron_right</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
