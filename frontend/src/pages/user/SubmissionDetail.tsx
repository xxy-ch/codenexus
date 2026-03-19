import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { ActionBar } from '@/components/page/ActionBar'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'

interface TestCase {
  id: number
  input: string
  expected_output: string
  actual_output?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  time_ms?: number
}

interface SubmissionDetailData {
  id: string
  problem_id: string
  problem_title: string
  user_id: string
  username: string
  code: string
  language: string
  status: string
  time_ms?: number
  memory_kb?: number
  error_message?: string
  test_cases?: TestCase[]
  created_at: string
  updated_at: string
}

export function SubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const [expandedTestCases, setExpandedTestCases] = useState<Set<number>>(new Set([0]))
  const [copied, setCopied] = useState(false)

  const {
    data: submission,
    isLoading,
    error,
    refetch,
  } = useQuery<SubmissionDetailData>({
    queryKey: ['submission', submissionId],
    queryFn: () => problemsService.getSubmissionDetail(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'pending' || status === 'running' ? 2000 : false
    },
  })

  const handleCopyCode = async () => {
    if (!submission?.code) return
    try {
      await navigator.clipboard.writeText(submission.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  const toggleTestCase = (id: number) => {
    setExpandedTestCases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <EmptyState
        title={
          error instanceof Error && error.message.includes('not found') ? '提交记录不存在' : '加载失败'
        }
        description={error instanceof Error ? error.message : '无法加载提交详情'}
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
            <Button variant="primary" onClick={() => refetch()}>
              重试
            </Button>
          </div>
        }
      />
    )
  }

  const statusConfig = getSubmissionStatusConfig(submission.status)
  const passedTestCases = submission.test_cases?.filter((tc) => tc.status === 'passed').length || 0
  const totalTestCases = submission.test_cases?.length || 0
  const statusLabel = statusConfig.label

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Submission Detail"
        breadcrumb={['Problems', submission.problem_title, `Submission #${submission.id}`]}
        title={`Submission #${submission.id}`}
        description={`${submission.problem_title} 的完整判题分析，包含状态摘要、性能数据和测试用例详情。`}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(-1)} aria-label="返回">
              返回
            </Button>
            <Link to={`/problems/${submission.problem_id}/solve`}>
              <Button variant="primary">再次挑战</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Verdict" value={statusLabel} />
        <StatCard
          label="Runtime"
          value={submission.time_ms !== undefined ? `${submission.time_ms}ms` : '-'}
        />
        <StatCard
          label="Memory"
          value={submission.memory_kb !== undefined ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
        />
        <StatCard label="Tests" value={`${passedTestCases}/${totalTestCases}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <SectionBlock
            title="判题分析摘要"
            description="状态、性能和测试点拆开呈现，阅读顺序贴近实际排错路径。"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
                  statusConfig.bgColor,
                  statusConfig.textColor,
                  statusConfig.borderColor,
                )}
              >
                <span className="material-symbols-outlined text-base">{statusConfig.icon}</span>
                {statusLabel}
              </div>
              <span className="text-sm text-slate-500">提交用户 {submission.username}</span>
              <span className="text-sm text-slate-500">语言 {submission.language}</span>
              <span className="text-sm text-slate-500">
                更新时间 {new Date(submission.updated_at).toLocaleString('zh-CN')}
              </span>
            </div>

            {(submission.status === 'pending' || submission.status === 'running') && (
              <SurfaceCard tone="muted" className="mt-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                  <p className="text-sm text-slate-700">
                    {submission.status === 'running' ? '您的代码正在判题中...' : '提交已进入判题队列。'}
                  </p>
                </div>
              </SurfaceCard>
            )}

            {(submission.status === 'compilation_error' ||
              submission.status === 'runtime_error' ||
              submission.status === 'wrong_answer') &&
              submission.error_message && (
                <SurfaceCard tone="muted" className="mt-4 border-rose-200 bg-rose-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">错误信息:</h3>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-rose-700">
                    {submission.error_message}
                  </pre>
                </SurfaceCard>
              )}
          </SectionBlock>

          {submission.test_cases && submission.test_cases.length > 0 && (
            <SectionBlock
              title="测试用例详情"
              description="展开测试点可查看输入、期望输出与实际输出。"
            >
              <div className="space-y-3">
                {submission.test_cases.map((testCase, index) => {
                  const isExpanded = expandedTestCases.has(index)
                  const isPassed = testCase.status === 'passed'

                  return (
                    <div
                      key={testCase.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border',
                        isPassed
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-rose-200 bg-rose-50/70',
                      )}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                        onClick={() => toggleTestCase(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'material-symbols-outlined text-xl',
                              isPassed ? 'text-emerald-600' : 'text-rose-600',
                            )}
                          >
                            {isPassed ? 'check_circle' : 'cancel'}
                          </span>
                          <div>
                            <p className="font-medium text-slate-950">测试用例 {testCase.id}</p>
                            {testCase.time_ms !== undefined ? (
                              <p className="text-xs text-slate-500">{testCase.time_ms}ms</p>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold',
                            isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                          )}
                        >
                          {isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-white/70 px-4 py-4">
                          {!isPassed && testCase.error ? (
                            <div className="text-xs text-rose-700">{testCase.error}</div>
                          ) : null}

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-600">输入:</p>
                              <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700">
                                {testCase.input}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-600">期望输出:</p>
                              <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700">
                                {testCase.expected_output}
                              </pre>
                            </div>
                          </div>

                          {testCase.actual_output && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-600">实际输出:</p>
                              <pre
                                className={cn(
                                  'overflow-x-auto rounded-xl p-3 text-xs font-mono',
                                  testCase.actual_output === testCase.expected_output
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800',
                                )}
                              >
                                {testCase.actual_output}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </SectionBlock>
          )}

          <SectionBlock
            title="提交代码"
            description={`语言: ${submission.language} • ${new Date(submission.created_at).toLocaleString('zh-CN')}`}
          >
            <div className="mb-4 flex justify-end">
              <Button variant="outline" size="small" onClick={handleCopyCode} className="min-w-[108px]">
                <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                {copied ? '已复制' : '复制代码'}
              </Button>
            </div>
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
              <code>{submission.code}</code>
            </pre>
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Analysis Sidebar
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  提交时间
                </p>
                <p className="mt-1 text-slate-950">
                  {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  更新时间
                </p>
                <p className="mt-1 text-slate-950">
                  {new Date(submission.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  提交用户
                </p>
                <p className="mt-1 text-slate-950">{submission.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  题目 ID
                </p>
                <p className="mt-1 text-slate-950">{submission.problem_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  提交 ID
                </p>
                <p className="mt-1 text-slate-950">{submission.id}</p>
              </div>
            </div>
          </SurfaceCard>

          <ActionBar className="justify-start xl:justify-end">
            <Button variant="outline" onClick={() => navigate(`/problems/${submission.problem_id}`)}>
              返回题目
            </Button>
            <Button variant="primary" onClick={() => refetch()}>
              刷新状态
            </Button>
          </ActionBar>
        </div>
      </div>
    </div>
  )
}
