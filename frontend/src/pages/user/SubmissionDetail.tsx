import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
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

function localizedStatusLabel(status: string) {
  const labels: Record<string, string> = {
    accepted: '已通过',
    wrong_answer: '答案错误',
    pending: '等待中',
    queued: '排队中',
    running: '运行中',
    compilation_error: '编译错误',
    runtime_error: '运行错误',
    time_limit_exceeded: '超出时间限制',
    memory_limit_exceeded: '超出内存限制',
    system_error: '系统错误',
    failed: '失败',
    judged: '已判题',
  }

  return labels[status] ?? getSubmissionStatusConfig(status).label
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
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="加载提交详情中..." />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title={
            error instanceof Error && error.message.includes('not found') ? '提交记录不存在' : '加载失败'
          }
          description={error instanceof Error ? error.message : '无法加载提交详情'}
          action={{
            label: '重试',
            onClick: () => refetch()
          }}
        />
      </div>
    )
  }

  const statusConfig = getSubmissionStatusConfig(submission.status)
  const passedTestCases = submission.test_cases?.filter((tc) => tc.status === 'passed').length || 0
  const totalTestCases = submission.test_cases?.length || 0
  const statusLabel = localizedStatusLabel(submission.status)

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            题目中心 / {submission.problem_title} / 提交 #{submission.id}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            提交详情
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {submission.problem_title} 的完整判题诊断，包含状态摘要、性能数据、测试点池和提交代码。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            返回
          </Button>
          <Link to={`/problems/${submission.problem_id}/solve`}>
            <Button>再次挑战</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Hero Card */}
        <Card variant="default" className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-on-primary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/70">当前诊断</p>
              <h2 className="mt-3 font-headline text-3xl font-extrabold text-on-primary md:text-4xl">判题诊断台</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/80">
                在同一屏里读取结果状态、性能指标和测试点反馈，阅读顺序贴近真实排错路径。
              </p>
            </div>
            <div className="rounded-2xl border border-on-primary/20 bg-on-primary/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/60">当前状态</p>
              <p className="mt-2 text-3xl font-semibold text-on-primary">{statusLabel}</p>
              <p className="mt-2 text-sm text-on-primary/70">{submission.problem_title}</p>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-2">
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">判题状态</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">{statusLabel}</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">运行时间</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              {submission.time_ms !== undefined ? `${submission.time_ms}ms` : '-'}
            </p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">内存占用</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              {submission.memory_kb !== undefined ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
            </p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">测试点通过</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              {passedTestCases}/{totalTestCases}
            </p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Analysis Summary */}
          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">判题分析摘要</h2>
            <p className="mt-1 text-sm text-on-surface-variant">状态、性能和测试点拆开呈现，阅读顺序贴近实际排错路径。</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
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
              <span className="text-sm text-on-surface-variant">提交用户 {submission.username}</span>
              <span className="text-sm text-on-surface-variant">语言 {submission.language}</span>
              <span className="text-sm text-on-surface-variant">
                更新时间 {new Date(submission.updated_at).toLocaleString('zh-CN')}
              </span>
            </div>

            {(submission.status === 'pending' || submission.status === 'running') && (
              <Card variant="surface" className="mt-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-on-surface" />
                  <p className="text-sm text-on-surface">
                    {submission.status === 'running' ? '您的代码正在判题中...' : '提交已进入判题队列。'}
                  </p>
                </div>
              </Card>
            )}

            {(submission.status === 'compilation_error' ||
              submission.status === 'runtime_error' ||
              submission.status === 'wrong_answer') &&
              submission.error_message && (
                <Card variant="surface" className="mt-4 border-error bg-error-container/30 p-4">
                  <h3 className="text-sm font-semibold text-on-surface">错误信息:</h3>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-on-error-container">
                    {submission.error_message}
                  </pre>
                </Card>
              )}
          </Card>

          {/* Test Cases */}
          {submission.test_cases && submission.test_cases.length > 0 && (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">测试点池</h2>
              <p className="mt-1 text-sm text-on-surface-variant">展开测试点可查看输入、期望输出与实际输出。</p>
              <div className="mt-5 space-y-3">
                {submission.test_cases.map((testCase, index) => {
                  const isExpanded = expandedTestCases.has(index)
                  const isPassed = testCase.status === 'passed'

                  return (
                    <div
                      key={testCase.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border',
                        isPassed
                          ? 'border-tertiary bg-tertiary-container/30'
                          : 'border-error bg-error-container/30',
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
                              isPassed ? 'text-tertiary' : 'text-error',
                            )}
                          >
                            {isPassed ? 'check_circle' : 'cancel'}
                          </span>
                          <div>
                            <p className="font-medium text-on-surface">测试用例 {testCase.id}</p>
                            {testCase.time_ms !== undefined ? (
                              <p className="text-xs text-on-surface-variant">{testCase.time_ms}ms</p>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold',
                            isPassed ? 'bg-tertiary text-on-tertiary' : 'bg-error text-on-error',
                          )}
                        >
                          {isPassed ? '通过' : '失败'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 border-t border-outline-variant/30 px-4 py-4">
                          {!isPassed && testCase.error ? (
                            <div className="text-xs text-on-error">{testCase.error}</div>
                          ) : null}

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-on-surface-variant">输入:</p>
                              <pre className="overflow-x-auto rounded-xl border border-outline-variant bg-surface p-3 text-xs font-mono text-on-surface">
                                {testCase.input}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-on-surface-variant">期望输出:</p>
                              <pre className="overflow-x-auto rounded-xl border border-outline-variant bg-surface p-3 text-xs font-mono text-on-surface">
                                {testCase.expected_output}
                              </pre>
                            </div>
                          </div>

                          {testCase.actual_output && (
                            <div>
                              <p className="mb-1 text-xs font-semibold text-on-surface-variant">实际输出:</p>
                              <pre
                                className={cn(
                                  'overflow-x-auto rounded-xl p-3 text-xs font-mono',
                                  testCase.actual_output === testCase.expected_output
                                    ? 'bg-tertiary-container/30 text-on-tertiary-container'
                                    : 'bg-error-container/30 text-on-error-container',
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
            </Card>
          )}

          {/* Submitted Code */}
          <Card variant="default" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-xl font-extrabold text-on-surface">提交代码</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  语言: {submission.language} • {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCode}
              >
                <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
                {copied ? '已复制' : '复制代码'}
              </Button>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-surface-container-high p-4 text-sm text-on-surface">
              <code>{submission.code}</code>
            </pre>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              诊断侧栏
            </p>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  提交时间
                </p>
                <p className="mt-1 text-on-surface">
                  {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  更新时间
                </p>
                <p className="mt-1 text-on-surface">
                  {new Date(submission.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  提交用户
                </p>
                <p className="mt-1 text-on-surface">{submission.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  题目 ID
                </p>
                <p className="mt-1 text-on-surface">{submission.problem_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  提交 ID
                </p>
                <p className="mt-1 text-on-surface">{submission.id}</p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/problems/${submission.problem_id}`)}
            >
              返回题目
            </Button>
            <Button variant="default" onClick={() => refetch()}>
              刷新状态
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
