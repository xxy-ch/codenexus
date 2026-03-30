import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { problemsService } from '@/services/problems'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { cn } from '@/lib/utils'

const statusLabels: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  time_limit_exceeded: 'Time Limit',
  memory_limit_exceeded: 'Memory Limit',
  compilation_error: 'Compile Error',
  runtime_error: 'Runtime Error',
  pending: 'Pending',
  running: 'Running',
  queued: 'Queued',
  system_error: 'System Error',
}

const languageLabels: Record<string, string> = {
  all: 'All Languages',
  cpp: 'C++',
  python: 'Python',
  java: 'Java',
  javascript: 'JavaScript',
  go: 'Go',
  rust: 'Rust',
}

function formatMemory(memoryKb?: number) {
  if (!memoryKb) return '--'
  return `${Math.round(memoryKb / 1024)} MB`
}

function formatRuntime(timeMs?: number) {
  if (!timeMs) return '--'
  return `${timeMs} ms`
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString()
}

export function SubmissionHistory() {
  const [status, setStatus] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-submissions', status, language, page],
    queryFn: () =>
      problemsService.getUserSubmissions({
        status: (status || undefined) as any,
        language: (language || undefined) as any,
        page,
        limit,
      }),
  })

  const submissions = data?.submissions ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / limit))

  const acceptedCount = submissions.filter((submission) => submission.status === 'accepted').length
  const wrongAnswerCount = submissions.filter((submission) => submission.status === 'wrong_answer').length
  const otherCount = submissions.length - acceptedCount - wrongAnswerCount
  const accuracy = submissions.length > 0 ? `${Math.round((acceptedCount / submissions.length) * 100)}%` : '0%'

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading submissions..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load submissions"
          message="Please check your connection and try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Submissions
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Submission History
            </h1>
            <p className="max-w-xl text-sm leading-6 text-on-surface-variant">
              Track your coding progress, view results, and analyze your performance over time.
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          {/* Main Overview Card */}
          <Card className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-white shadow-lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-fixed/72">
                  Overview
                </p>
                <h2 className="mt-3 font-headline text-3xl font-extrabold tracking-tight">
                  Submission Dashboard
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-primary-fixed/90">
                  View your submission statistics, acceptance rate, and recent activity all in one place.
                </p>
              </div>
              <div className="rounded-xl border border-white/16 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                  Acceptance Rate
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">{accuracy}</p>
                <p className="mt-2 text-sm text-white/74">Based on current filters</p>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card variant="surface" className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Total Submissions
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-surface">{total}</p>
            </Card>

            <Card variant="surface" className="p-5 border-l-4 border-tertiary">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                Accepted
              </p>
              <p className="mt-3 text-3xl font-semibold text-tertiary">{acceptedCount}</p>
            </Card>

            <Card variant="surface" className="p-5 border-l-4 border-error">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-error-container">
                Wrong Answer
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-error-container">{wrongAnswerCount}</p>
            </Card>

            <Card variant="surface" className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Other
              </p>
              <p className="mt-3 text-3xl font-semibold text-on-surface">{Math.max(otherCount, 0)}</p>
            </Card>
          </div>
        </div>

        {/* Filters and Table */}
        <Card className="p-6">
          <div className="flex flex-col gap-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
                  Filter by Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: '', label: 'All' },
                    { value: 'accepted', label: 'Accepted' },
                    { value: 'wrong_answer', label: 'Wrong Answer' },
                    { value: 'queued', label: 'Queued' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setStatus(item.value)
                        setPage(1)
                      }}
                      className={cn(
                        'inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold transition-colors',
                        status === item.value
                          ? 'bg-primary text-on-primary shadow-md'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:items-end">
                <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span>Language</span>
                  <select
                    aria-label="language"
                    value={language || 'all'}
                    onChange={(event) => {
                      const value = event.target.value === 'all' ? '' : event.target.value
                      setLanguage(value)
                      setPage(1)
                    }}
                    className="rounded-lg bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {[
                      { value: 'all', label: 'All Languages' },
                      { value: 'cpp', label: 'C++' },
                      { value: 'python', label: 'Python' },
                      { value: 'java', label: 'Java' },
                      { value: 'javascript', label: 'JavaScript' },
                      { value: 'go', label: 'Go' },
                    ].map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {/* Table */}
            {submissions.length === 0 ? (
              <EmptyState
                title="No submissions found"
                description="Try adjusting your filters or submit some code to see results here."
                icon={
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                    history
                  </span>
                }
              />
            ) : (
              <>
                <div className="overflow-hidden rounded-xl bg-surface-container-low/50">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4">Problem</th>
                        <th className="px-4 py-4">Language</th>
                        <th className="px-4 py-4">Runtime</th>
                        <th className="px-4 py-4">Memory</th>
                        <th className="px-4 py-4">Submitted</th>
                        <th className="px-4 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {submissions.map((submission) => (
                        <tr
                          key={submission.id}
                          className="group border-t border-outline-variant/10 bg-white transition-colors hover:bg-surface-container-low/50"
                        >
                          <td className="px-4 py-4">
                            <StatusBadge
                              status={submission.status as any}
                            />
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              to={`/submissions/${submission.id}`}
                              className="block"
                            >
                              <p className="truncate text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                                {submission.problem_title || `Problem ${submission.problem_id}`}
                              </p>
                              {submission.error_message ? (
                                <p className="mt-1 text-xs text-on-surface-variant">{submission.error_message}</p>
                              ) : null}
                            </Link>
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-on-surface-variant">
                            {submission.language}
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-on-surface-variant">
                            {formatRuntime(submission.time_ms)}
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-on-surface-variant">
                            {formatMemory(submission.memory_kb)}
                          </td>
                          <td className="px-4 py-4 text-sm text-on-surface-variant">
                            {formatDateTime(submission.created_at)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button
                              as={Link}
                              to={`/submissions/${submission.id}`}
                              variant="ghost"
                              size="sm"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pageCount > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={page}
                      totalPages={pageCount}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SubmissionHistory
