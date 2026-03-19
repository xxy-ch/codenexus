import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'

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
    setPage(1)
  }

  const handleLanguageFilter = (language: string) => {
    setLanguageFilter(language)
    setPage(1)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="加载失败"
          description="无法加载提交记录，请稍后重试。"
          action={
            <Button variant="primary" onClick={() => refetch()}>
              重试
            </Button>
          }
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  if (!data || data.submissions.length === 0) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <EmptyState
          title="暂无提交记录"
          description="开始解题后，您的提交记录将显示在这里。"
          action={
            <Button as={Link} to="/problems" variant="primary">
              <span className="material-symbols-outlined text-base">code</span>
              浏览题目
            </Button>
          }
          className="w-full max-w-xl"
        />
      </div>
    )
  }

  const totalPages = Math.ceil(data.total / limit)
  const acceptedCount = data.submissions.filter((submission) => submission.status === 'accepted').length
  const averageRuntime =
    data.submissions.reduce((sum, submission) => sum + (submission.time_ms ?? 0), 0) /
    Math.max(1, data.submissions.length)
  const averageMemory =
    data.submissions.reduce((sum, submission) => sum + (submission.memory_kb ?? 0), 0) /
    Math.max(1, data.submissions.length)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Submission Archive"
        title="提交历史"
        description={`统一查看最近提交的状态、运行表现和语言分布。当前结果集共 ${data.total} 条记录，已通过 ${acceptedCount} 条。`}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前页" value={`${page}`} helper={`共 ${totalPages} 页`} />
        <StatCard label="Accepted" value={`${acceptedCount} 条`} helper="当前结果集通过数量" />
        <StatCard label="平均运行时间" value={`${Math.round(averageRuntime)}ms`} helper="按当前页计算" />
        <StatCard label="平均内存" value={`${Math.round(averageMemory / 1024)}MB`} helper="按当前页计算" />
      </div>

      <FilterBar>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">状态</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilter('all')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                statusFilter === 'all'
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              全部
            </button>
            <button
              onClick={() => handleStatusFilter('accepted')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                statusFilter === 'accepted'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              Accepted
            </button>
            <button
              onClick={() => handleStatusFilter('wrong_answer')}
              className={cn(
                'rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                statusFilter === 'wrong_answer'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              Wrong Answer
            </button>
          </div>
        </div>

        <label htmlFor="language-filter" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span>语言</span>
          <select
            id="language-filter"
            value={languageFilter}
            onChange={(event) => handleLanguageFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          >
            <option value="all">全部语言</option>
            {Object.entries(LANGUAGE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </label>
      </FilterBar>

      <SectionBlock
        title="结果列表"
        description="按时间倒序展示，点击任一行进入提交详情分析。"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">状态</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">题目</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">语言</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">运行时间</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">内存</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">提交时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.submissions.map((submission) => {
                const statusConfig = getSubmissionStatusConfig(submission.status)
                const languageConfig =
                  LANGUAGE_CONFIG[submission.language as keyof typeof LANGUAGE_CONFIG] || {
                    label: submission.language,
                    icon: 'code',
                  }

                return (
                  <tr
                    key={submission.id}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => navigate(`/submissions/${submission.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-medium',
                          statusConfig.bgColor,
                          statusConfig.textColor,
                        )}
                      >
                        <span className="material-symbols-outlined text-sm">{statusConfig.icon}</span>
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-950">{submission.problem_title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{languageConfig.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {submission.time_ms ? `${submission.time_ms}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {submission.memory_kb ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(submission.created_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5">
            <div className="text-sm text-slate-500">第 {page} 页，共 {totalPages} 页</div>
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
        ) : null}
      </SectionBlock>
    </div>
  )
}
