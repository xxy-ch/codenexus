import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

interface SubmissionResult {
  id: string
  status: 'pending' | 'running' | 'accepted' | 'wrong_answer' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'compilation_error' | 'runtime_error'
  runtime?: number
  memory?: number
  error?: string
  testCases?: TestCaseResult[]
}

interface TestCaseResult {
  id: number
  input: string
  expectedOutput: string
  actualOutput?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  runtime?: number
}

interface SubmissionResultProps {
  submission: SubmissionResult
  onClose?: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-600 dark:text-slate-400',
    icon: 'schedule',
    iconColor: 'text-slate-400',
  },
  running: {
    label: 'Running',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: 'sync',
    iconColor: 'text-blue-500',
  },
  accepted: {
    label: 'Accepted',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    icon: 'check_circle',
    iconColor: 'text-green-500',
  },
  wrong_answer: {
    label: 'Wrong Answer',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    icon: 'cancel',
    iconColor: 'text-red-500',
  },
  time_limit_exceeded: {
    label: 'Time Limit Exceeded',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    icon: 'timer',
    iconColor: 'text-yellow-500',
  },
  memory_limit_exceeded: {
    label: 'Memory Limit Exceeded',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-400',
    icon: 'memory',
    iconColor: 'text-orange-500',
  },
  compilation_error: {
    label: 'Compilation Error',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: 'error',
    iconColor: 'text-purple-500',
  },
  runtime_error: {
    label: 'Runtime Error',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    textColor: 'text-pink-700 dark:text-pink-400',
    icon: 'warning',
    iconColor: 'text-pink-500',
  },
}

export function SubmissionResult({ submission, onClose }: SubmissionResultProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 模拟实时状态更新 (在实际应用中会通过WebSocket或轮询获取)
  const [currentStatus, setCurrentStatus] = useState(submission.status)

  useEffect(() => {
    if (submission.status === 'pending' || submission.status === 'running') {
      // 模拟状态变化
      const timer = setTimeout(() => {
        setCurrentStatus('running')
        setTimeout(() => {
          setCurrentStatus(submission.status)
        }, 2000)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [submission.status])

  const currentConfig = STATUS_CONFIG[currentStatus]

  return (
    <div className={cn(
      'rounded-xl border-2 transition-all',
      currentConfig.bgColor,
      currentConfig.textColor.replace('text-', 'border-').replace('dark:', 'dark:border-')
    )}>
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(currentStatus === 'running' || currentStatus === 'pending') && (
            <div className="animate-spin">
              <div className="w-5 h-5 border-2 border-current rounded-full border-t-transparent"></div>
            </div>
          )}
          <span className={cn('material-symbols-outlined text-2xl', currentConfig.iconColor)}>
            {currentConfig.icon}
          </span>
          <div>
            <h3 className={cn('font-semibold', currentStatus === 'accepted' ? 'text-green-600 dark:text-green-400' : '')}>
              {currentConfig.label}
            </h3>
            {currentStatus === 'running' && (
              <p className="text-xs opacity-75">Your code is being judged...</p>
            )}
          </div>
        </div>

        {onClose && currentStatus !== 'running' && currentStatus !== 'pending' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-current opacity-75 hover:opacity-100"
          >
            <span className="material-symbols-outlined">close</span>
          </Button>
        )}
      </div>

      {/* Content */}
      {(currentStatus === 'accepted' ||
        currentStatus === 'wrong_answer' ||
        currentStatus === 'time_limit_exceeded' ||
        currentStatus === 'memory_limit_exceeded') && (
        <div className="px-6 py-4 border-t border-current border-opacity-20">
          {/* Stats */}
          <div className="flex items-center gap-6 mb-4">
            {submission.runtime !== undefined && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">schedule</span>
                <span className="text-sm font-medium">{submission.runtime}ms</span>
              </div>
            )}
            {submission.memory !== undefined && (
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">memory</span>
                <span className="text-sm font-medium">{submission.memory}MB</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submission.error && (
            <div className="bg-white dark:bg-slate-900 rounded-lg p-4 mb-4">
              <p className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {submission.error}
              </p>
            </div>
          )}

          {/* Test Cases */}
          {submission.testCases && submission.testCases.length > 0 && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-medium mb-3"
              >
                <span className="material-symbols-outlined">
                  {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
                Test Cases ({submission.testCases.filter(tc => tc.status === 'passed').length}/{submission.testCases.length} passed)
              </button>

              {isExpanded && (
                <div className="space-y-2">
                  {submission.testCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      className={cn(
                        'bg-white dark:bg-slate-900 rounded-lg p-3 border',
                        testCase.status === 'passed'
                          ? 'border-green-200 dark:border-green-800'
                          : 'border-red-200 dark:border-red-800'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg">
                            {testCase.status === 'passed' ? 'check_circle' : 'cancel'}
                          </span>
                          <span className="text-sm font-medium">
                            Test Case {testCase.id}
                          </span>
                        </div>
                        {testCase.runtime !== undefined && (
                          <span className="text-xs text-slate-500">
                            {testCase.runtime}ms
                          </span>
                        )}
                      </div>

                      {testCase.status === 'failed' && testCase.error && (
                        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                          {testCase.error}
                        </div>
                      )}

                      <div className="mt-2 space-y-1">
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Input:</p>
                          <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">Expected:</p>
                          <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                        {testCase.actualOutput && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Actual:</p>
                            <pre className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded font-mono">
                              {testCase.actualOutput}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            {currentStatus === 'accepted' && (
              <Button variant="primary" size="sm">
                <span className="material-symbols-outlined mr-1">celebration</span>
                Share Solution
              </Button>
            )}
            {(currentStatus === 'wrong_answer' ||
              currentStatus === 'time_limit_exceeded' ||
              currentStatus === 'memory_limit_exceeded') && (
              <Button variant="outline" size="sm">
                <span className="material-symbols-outlined mr-1">replay</span>
                Try Again
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Loading skeleton for submission
export function SubmissionResultSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin">
          <div className="w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
        </div>
        <div>
          <h3 className="font-semibold">Submitting...</h3>
          <p className="text-sm text-slate-500">Please wait while we judge your solution</p>
        </div>
      </div>
    </div>
  )
}