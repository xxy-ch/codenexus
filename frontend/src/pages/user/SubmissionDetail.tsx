import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

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
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error'
  time_ms?: number
  memory_kb?: number
  error_message?: string
  test_cases?: TestCase[]
  created_at: string
  updated_at: string
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-300 dark:border-slate-700',
    icon: 'schedule',
    iconColor: 'text-slate-400',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: 'sync',
    iconColor: 'text-blue-500',
  },
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: 'check_circle',
    iconColor: 'text-green-500',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: 'cancel',
    iconColor: 'text-red-500',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-300 dark:border-yellow-700',
    icon: 'timer',
    iconColor: 'text-yellow-500',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: 'memory',
    iconColor: 'text-orange-500',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-300 dark:border-purple-700',
    icon: 'error',
    iconColor: 'text-purple-500',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-400',
    borderColor: 'border-pink-300 dark:border-pink-700',
    icon: 'warning',
    iconColor: 'text-pink-500',
  },
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
    refetchInterval: (data) => {
      // 如果是pending或running状态，每2秒轮询一次
      if (data?.status === 'pending' || data?.status === 'running') {
        return 2000
      }
      return false
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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载中..." />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {error instanceof Error && error.message.includes('not found')
            ? '提交记录不存在'
            : '加载失败'}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {error instanceof Error ? error.message : '无法加载提交详情'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
            返回
          </Button>
          <Button variant="primary" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[submission.status]
  const passedTestCases = submission.test_cases?.filter(tc => tc.status === 'passed').length || 0
  const totalTestCases = submission.test_cases?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {submission.problem_title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              提交 ID: {submission.id}
            </p>
          </div>
        </div>
      </div>

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
            <Link to={`/problems/${submission.problem_id}/solve`}>
              <Button variant="primary" size="sm">
                <span className="material-symbols-outlined mr-2">replay</span>
                再次挑战
              </Button>
            </Link>
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

      {/* Code Display */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">提交代码</h3>
            <p className="text-xs text-slate-500 mt-1">
              语言: {submission.language} • {new Date(submission.created_at).toLocaleString('zh-CN')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
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
          <pre className="text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-x-auto font-mono">
            <code>{submission.code}</code>
          </pre>
        </div>
      </div>

      {/* Submission Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">提交信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">提交时间:</span>
            <span className="ml-2 text-slate-900 dark:text-white">
              {new Date(submission.created_at).toLocaleString('zh-CN')}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">更新时间:</span>
            <span className="ml-2 text-slate-900 dark:text-white">
              {new Date(submission.updated_at).toLocaleString('zh-CN')}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">提交用户:</span>
            <span className="ml-2 text-slate-900 dark:text-white">
              {submission.username}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">题目ID:</span>
            <span className="ml-2 text-slate-900 dark:text-white">
              {submission.problem_id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}