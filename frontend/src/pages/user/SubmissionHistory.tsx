import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { problemsService } from '@/services/problems'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { useNavigate } from 'react-router-dom'

const statuses = ['accepted', 'wrong_answer', 'queued']
const languages = ['all', 'cpp', 'python']

function formatMemory(memoryKb?: number) {
  if (!memoryKb) return '--'
  return `${Math.round(memoryKb / 1024)}MB`
}

function formatRuntime(timeMs?: number) {
  if (!timeMs) return '--'
  return `${timeMs}ms`
}

function statusTone(status: string) {
  if (status === 'accepted') return 'bg-[#e4f7ee] text-[#006847]'
  if (status === 'wrong_answer') return 'bg-[#ffdad6] text-[#93000a]'
  return 'bg-[#d5e3fc] text-[#3a485b]'
}

export function SubmissionHistory() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>('')
  const [language, setLanguage] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-submissions', status, language, page],
    queryFn: () => problemsService.getUserSubmissions({ status: status || undefined, language: language || undefined, page, limit }),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard className="text-sm text-[#6b7ca7]">加载中...</SurfaceCard>
      </div>
    )
  }

  const submissions = data?.submissions ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / limit))

  if (isError) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <SurfaceCard>
          <h1 className="font-['Manrope'] text-[1.6rem] font-extrabold tracking-[-0.03em] text-[#131b2e]">加载失败</h1>
        </SurfaceCard>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Submissions"
          title="提交历史"
          description="Track your progress and performance across algorithmic challenges. Analyze runtime and memory consumption for every iteration."
        />

        <SurfaceCard>
          <div className="flex flex-wrap items-center gap-3">
            {statuses.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setStatus(item)
                  setPage(1)
                }}
                className={status === item
                  ? 'rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-full bg-[rgba(226,231,255,0.88)] px-4 py-2 text-sm font-semibold text-[#445472]'}
              >
                {getSubmissionStatusConfig(item).label}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-[#65748d]">
              <span>语言</span>
              <select
                aria-label="语言"
                value={language || 'all'}
                onChange={(event) => {
                  const value = event.target.value === 'all' ? '' : event.target.value
                  setLanguage(value)
                  setPage(1)
                }}
                className="rounded-[8px] bg-[rgba(242,243,255,0.88)] px-3 py-2 text-sm font-semibold text-[#17305e] outline-none"
              >
                {languages.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          {submissions.length === 0 ? (
            <div className="mt-6 rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-5 text-sm text-[#65748d]">暂无提交记录</div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[10px] bg-[rgba(242,243,255,0.7)]">
              <table className="w-full" role="table">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Problem</th>
                    <th className="px-4 py-4">Language</th>
                    <th className="px-4 py-4">Runtime</th>
                    <th className="px-4 py-4">Memory</th>
                    <th className="px-4 py-4">Submitted</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {submissions.map((submission) => (
                    <tr
                      key={submission.id}
                      onClick={() => navigate(`/submissions/${submission.id}`)}
                      className="cursor-pointer border-t border-[rgba(195,198,214,0.18)] bg-white transition-colors hover:bg-[#f8f9ff]"
                    >
                      <td className="px-4 py-4">
                        <span className={`w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusTone(submission.status)}`}>
                          {getSubmissionStatusConfig(submission.status).label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="truncate text-sm font-semibold text-[#131b2e]">{submission.problem_title}</p>
                        {submission.error_message ? <p className="mt-1 text-xs text-[#65748d]">{submission.error_message}</p> : null}
                      </td>
                      <td className="px-4 py-4 font-mono text-sm text-[#445472]">{submission.language}</td>
                      <td className="px-4 py-4 font-mono text-sm text-[#445472]">{formatRuntime(submission.time_ms)}</td>
                      <td className="px-4 py-4 font-mono text-sm text-[#445472]">{formatMemory(submission.memory_kb)}</td>
                      <td className="px-4 py-4 text-sm text-[#65748d]">{new Date(submission.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-[#65748d]">第 {page} 页 / Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="上一页"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={page === 1}
                className="rounded-[8px] bg-[rgba(226,231,255,0.88)] px-3 py-2 text-sm font-semibold text-[#445472] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                aria-label="下一页"
                onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                disabled={page === pageCount}
                className="rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

export default SubmissionHistory
