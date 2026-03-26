import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { problemsService } from '@/services/problems'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { useNavigate } from 'react-router-dom'

const statuses = ['accepted', 'wrong_answer', 'queued']
const languages = ['all', 'cpp', 'python']
const statusLabels: Record<string, string> = {
  accepted: '已通过',
  wrong_answer: '答案错误',
  queued: '排队中',
}
const languageLabels: Record<string, string> = {
  all: '全部语言',
  cpp: 'C++',
  python: 'Python',
}

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
  const acceptedCount = submissions.filter((submission) => submission.status === 'accepted').length
  const wrongAnswerCount = submissions.filter((submission) => submission.status === 'wrong_answer').length
  const otherCount = submissions.length - acceptedCount - wrongAnswerCount
  const accuracy = submissions.length > 0 ? `${Math.round((acceptedCount / submissions.length) * 100)}%` : '0%'

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
          eyebrow="提交工作台"
          title="提交历史"
          description="把提交记录收成工作台式信息页，顶部先给概览和通过率，再进入提交记录池查看语言、性能和时间轴。"
        />

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
          <SurfaceCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(7,43,117,0.98)_0%,rgba(13,82,186,0.96)_54%,rgba(140,198,255,0.9)_100%)] px-6 py-6 text-white shadow-[0_22px_48px_rgba(8,50,132,0.22)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">当前概览</p>
                <h2 className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-white md:text-[2.5rem]">提交工作台</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                  在一屏里读取提交总量、通过率和最近迭代节奏，不再退回普通列表页。
                </p>
              </div>
              <div className="rounded-[28px] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">当前通过率</p>
                <p className="mt-2 text-3xl font-semibold text-white">{accuracy}</p>
                <p className="mt-2 text-sm text-white/74">基于当前筛选范围内的提交记录计算</p>
              </div>
            </div>
          </SurfaceCard>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.94)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">总提交数</p>
              <p className="mt-3 text-3xl font-semibold text-[#131b2e]">{total}</p>
            </SurfaceCard>
            <SurfaceCard className="border-l-4 border-[#006847] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(230,247,238,0.92)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#006847]">已通过</p>
              <p className="mt-3 text-3xl font-semibold text-[#006847]">{acceptedCount}</p>
            </SurfaceCard>
            <SurfaceCard className="border-l-4 border-[#93000a] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,240,238,0.92)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#93000a]">答案错误</p>
              <p className="mt-3 text-3xl font-semibold text-[#93000a]">{wrongAnswerCount}</p>
            </SurfaceCard>
            <SurfaceCard className="border-l-4 border-[#445472] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(240,244,252,0.92)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#445472]">待处理与其他</p>
              <p className="mt-3 text-3xl font-semibold text-[#131b2e]">{Math.max(otherCount, 0)}</p>
            </SurfaceCard>
          </div>
        </div>

        <SurfaceCard>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4f6ea8]">提交记录池</p>
                <h2 className="mt-2 font-['Manrope'] text-[1.45rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">提交记录池</h2>
              </div>
              <div className="flex flex-col gap-3 xl:items-end">
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
                        ? 'inline-flex h-12 items-center rounded-full bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 text-sm font-semibold text-white'
                        : 'inline-flex h-12 items-center rounded-full bg-[rgba(226,231,255,0.88)] px-5 text-sm font-semibold text-[#445472]'}
                    >
                      {statusLabels[item]}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm text-[#65748d]">
                  <span>语言筛选</span>
                  <select
                    aria-label="语言"
                    value={language || 'all'}
                    onChange={(event) => {
                      const value = event.target.value === 'all' ? '' : event.target.value
                      setLanguage(value)
                      setPage(1)
                    }}
                    className="h-12 rounded-[16px] bg-[rgba(242,243,255,0.88)] px-4 text-sm font-semibold text-[#17305e] outline-none shadow-[0_10px_24px_rgba(19,27,46,0.04)]"
                  >
                    {languages.map((item) => (
                      <option key={item} value={item}>{languageLabels[item]}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="rounded-[8px] bg-[rgba(242,243,255,0.68)] px-4 py-5 text-sm text-[#65748d]">暂无提交记录</div>
            ) : (
              <div className="overflow-hidden rounded-[18px] bg-[rgba(242,243,255,0.7)]">
                <table className="w-full" role="table">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">
                    <th className="px-4 py-4">状态</th>
                    <th className="px-4 py-4">题目</th>
                    <th className="px-4 py-4">语言</th>
                    <th className="px-4 py-4">运行时间</th>
                    <th className="px-4 py-4">内存</th>
                    <th className="px-4 py-4">提交时间</th>
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

            <div className="flex items-center justify-between">
              <span className="text-sm text-[#65748d]">第 {page} 页，共 {pageCount} 页</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="上一页"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={page === 1}
                  className="inline-flex h-12 items-center rounded-[16px] bg-[rgba(226,231,255,0.88)] px-4 text-sm font-semibold text-[#445472] disabled:opacity-40"
                >
                  上一页
                </button>
                <button
                  type="button"
                  aria-label="下一页"
                  onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                  disabled={page === pageCount}
                  className="inline-flex h-12 items-center rounded-[16px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}

export default SubmissionHistory
