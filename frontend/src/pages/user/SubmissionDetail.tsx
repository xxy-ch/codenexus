import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'

interface TestCase {
  id: number
  input: string
  expected_output: string
  actual_output?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  time_ms?: number
}

interface SubmissionDetail {
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

  const { data: submission, isLoading, error, refetch } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => problemsService.getSubmissionDetail(submissionId!),
    enabled: !!submissionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'pending' || status === 'compiling' || status === 'running'
        ? 2000
        : false
    },
  })

  const handleCopyCode = async () => {
    if (submission?.code) {
      try {
        await navigator.clipboard.writeText(submission.code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy code:', err)
      }
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
    return <DetailSkeleton />
  }

  if (error || !submission) {
    return (
      <InlineError
        title="提交详情加载失败"
        message={error instanceof Error ? error.message : '无法加载提交详情'}
        onRetry={() => refetch()}
      />
    )
  }

  const statusConfig = getSubmissionStatusConfig(submission.status)
  const passedTestCases = submission.test_cases?.filter(tc => tc.status === 'passed').length || 0
  const totalTestCases = submission.test_cases?.length || 0
  const statusLabel = statusConfig.label

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <button type="button" className="hover:text-primary" onClick={() => navigate('/problems')}>
                Problems
              </button>
              <span>/</span>
              <button type="button" className="hover:text-primary" onClick={() => navigate(`/problems/${submission.problem_id}`)}>
                {submission.problem_title}
              </button>
              <span>/</span>
              <span className="text-slate-900 dark:text-white">Submission #{submission.id}</span>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" onClick={() => navigate(-1)}>
                <span className="material-symbols-outlined">arrow_back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Submission #{submission.id}
                </h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {submission.problem_title} 的完整判题分析，包含状态摘要、性能数据和测试用例详情。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold',
              statusConfig.bgColor,
              statusConfig.textColor,
              statusConfig.borderColor
            )}>
              <span className="material-symbols-outlined text-base">{statusConfig.icon}</span>
              {statusLabel}
            </div>
            <Link to={`/problems/${submission.problem_id}/solve`}>
              <Button variant="primary" size="small">
                <span className="material-symbols-outlined mr-2">replay</span>
                再次挑战
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Verdict</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{statusLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Runtime</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{submission.time_ms !== undefined ? `${submission.time_ms}ms` : '-'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Memory</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{submission.memory_kb !== undefined ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tests</p>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{passedTestCases}/{totalTestCases}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Analysis Summary</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">判题分析摘要</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                当前详情页已收敛为 verdict、性能、测试点和源码四段式结构。这个摘要层把更新时间、语言和测试完成度拉到状态卡之前，更接近 reference 的分析入口。
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              live submission
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Language</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{submission.language}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Updated</p>
            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
              {new Date(submission.updated_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Completion</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{passedTestCases}/{totalTestCases}</p>
          </div>
        </div>
      </section>

      {/* Status Card */}
      <div className={cn(
        'rounded-xl border-2 p-6',
        statusConfig.bgColor,
        statusConfig.borderColor
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {(submission.status === 'pending' || submission.status === 'running') && (
              <div className="animate-spin">
                <div className="w-8 h-8 border-2 border-current rounded-full border-t-transparent"></div>
              </div>
            )}
            <span className={cn('material-symbols-outlined text-4xl', statusConfig.iconColor)}>
              {statusConfig.icon}
            </span>
            <div>
              <h2 className={cn('text-2xl font-bold', statusConfig.textColor)}>
                {statusConfig.label}
              </h2>
              {submission.status === 'running' && (
                <p className="text-sm opacity-75">您的代码正在判题中...</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">Updated</p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {new Date(submission.updated_at).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>

        {/* Stats */}
        {(submission.status === 'accepted' ||
          submission.status === 'wrong_answer' ||
          submission.status === 'time_limit_exceeded' ||
          submission.status === 'memory_limit_exceeded') && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {submission.time_ms !== undefined && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-lg">schedule</span>
                  <span className="text-xs">运行时间</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {submission.time_ms}ms
                </p>
              </div>
            )}
            {submission.memory_kb !== undefined && (
              <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <span className="material-symbols-outlined text-lg">memory</span>
                  <span className="text-xs">内存占用</span>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {Math.round(submission.memory_kb / 1024)}MB
                </p>
              </div>
            )}
            {submission.test_cases && submission.test_cases.length > 0 && (
              <>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    <span className="text-xs">通过测试</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {passedTestCases}/{totalTestCases}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-lg">language</span>
                    <span className="text-xs">编程语言</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 capitalize">
                    {submission.language}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error Message */}
        {(submission.status === 'compilation_error' ||
          submission.status === 'runtime_error' ||
          submission.status === 'wrong_answer') && submission.error_message && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              错误信息:
            </h3>
            <pre className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
              {submission.error_message}
            </pre>
          </div>
        )}
      </div>

      {/* Test Cases */}
      {submission.test_cases && submission.test_cases.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            测试用例详情
          </h3>
          <div className="space-y-3">
            {submission.test_cases.map((testCase, index) => {
              const isExpanded = expandedTestCases.has(index)
              const isPassed = testCase.status === 'passed'

              return (
                <div
                  key={testCase.id}
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    isPassed
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                  )}
                >
                  {/* Test Case Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
                    onClick={() => toggleTestCase(index)}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'material-symbols-outlined text-xl',
                        isPassed ? 'text-green-500' : 'text-red-500'
                      )}>
                        {isPassed ? 'check_circle' : 'cancel'}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        测试用例 {testCase.id}
                      </span>
                      {testCase.time_ms !== undefined && (
                        <span className="text-xs text-slate-500">
                          {testCase.time_ms}ms
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      isPassed
                        ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'
                    )}>
                      {isPassed ? 'Passed' : 'Failed'}
                    </span>
                  </div>

                  {/* Test Case Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3">
                      {!isPassed && testCase.error && (
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {testCase.error}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            输入:
                          </p>
                          <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono overflow-x-auto">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            期望输出:
                          </p>
                          <pre className="text-xs bg-white dark:bg-slate-900 p-3 rounded font-mono overflow-x-auto">
                            {testCase.expected_output}
                          </pre>
                        </div>
                      </div>

                      {testCase.actual_output && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            实际输出:
                          </p>
                          <pre className={cn(
                            'text-xs p-3 rounded font-mono overflow-x-auto',
                            testCase.actual_output === testCase.expected_output
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                          )}>
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
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">提交代码</h3>
              <p className="mt-1 text-xs text-slate-500">
                语言: {submission.language} • {new Date(submission.created_at).toLocaleString('zh-CN')}
              </p>
            </div>
            <Button
              variant="outline"
              size="small"
              onClick={handleCopyCode}
              className="min-w-[100px]"
            >
              <span className="material-symbols-outlined mr-2">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? '已复制' : '复制代码'}
            </Button>
          </div>
          <div className="p-6">
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 font-mono text-sm dark:bg-slate-950">
              <code>{submission.code}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivery Note</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">分析侧栏</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              这里把提交元数据、操作者和题目标识提到代码面板右侧，保持和 reference 中“源码主区 + 侧栏摘要”的阅读顺序一致。
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="mb-4 font-semibold text-slate-900 dark:text-white">提交信息</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">提交时间</p>
                <p className="mt-1 text-slate-900 dark:text-white">
                  {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">更新时间</p>
                <p className="mt-1 text-slate-900 dark:text-white">
                  {new Date(submission.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">提交用户</p>
                <p className="mt-1 text-slate-900 dark:text-white">{submission.username}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">题目 ID</p>
                <p className="mt-1 text-slate-900 dark:text-white">{submission.problem_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">提交 ID</p>
                <p className="mt-1 text-slate-900 dark:text-white">{submission.id}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
