import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/Button'
import { Clock, Cpu, Loader2, CheckCircle, XCircle, Timer, AlertCircle, ChevronDown, ChevronUp, PartyPopper, RotateCcw, X } from 'lucide-react'

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
    label: '等待中',
    bgColor: 'bg-secondary',
    textColor: 'text-muted-foreground',
    icon: Loader2,
    iconColor: 'text-muted-foreground',
  },
  running: {
    label: '评测中',
    bgColor: 'bg-status-pending/10',
    textColor: 'text-status-pending',
    icon: Loader2,
    iconColor: 'text-status-pending',
  },
  accepted: {
    label: '通过',
    bgColor: 'bg-status-accepted/10',
    textColor: 'text-status-accepted',
    icon: CheckCircle,
    iconColor: 'text-status-accepted',
  },
  wrong_answer: {
    label: '答案错误',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    icon: XCircle,
    iconColor: 'text-destructive',
  },
  time_limit_exceeded: {
    label: '超时',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    icon: Timer,
    iconColor: 'text-status-tle',
  },
  memory_limit_exceeded: {
    label: '内存超限',
    bgColor: 'bg-status-tle/10',
    textColor: 'text-status-tle',
    icon: Cpu,
    iconColor: 'text-status-tle',
  },
  compilation_error: {
    label: '编译错误',
    bgColor: 'bg-status-re/10',
    textColor: 'text-status-re',
    icon: AlertCircle,
    iconColor: 'text-status-re',
  },
  runtime_error: {
    label: '运行错误',
    bgColor: 'bg-destructive/10',
    textColor: 'text-destructive',
    icon: AlertCircle,
    iconColor: 'text-destructive',
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
  const StatusIcon = currentConfig.icon

  return (
    <div className={cn(
      'rounded-xl border-2 transition-all',
      currentConfig.bgColor,
      currentConfig.textColor.replace('text-', 'border-').replace('dark:', 'dark:border-')
    )}>
      {/* 头部 */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(currentStatus === 'running' || currentStatus === 'pending') && (
            <StatusIcon className="w-5 h-5 animate-spin" />
          )}
          {currentStatus !== 'running' && currentStatus !== 'pending' && (
            <StatusIcon className={cn('w-6 h-6', currentConfig.iconColor)} />
          )}
          <div>
            <h3 className={cn('font-semibold', currentStatus === 'accepted' ? 'text-status-accepted' : '')}>
              {currentConfig.label}
            </h3>
            {currentStatus === 'running' && (
              <p className="text-xs opacity-75">正在评测您的代码...</p>
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
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* 内容 */}
      {(currentStatus === 'accepted' ||
        currentStatus === 'wrong_answer' ||
        currentStatus === 'time_limit_exceeded' ||
        currentStatus === 'memory_limit_exceeded') && (
        <div className="px-6 py-4 border-t border-current border-opacity-20">
          {/* 统计信息 */}
          <div className="flex items-center gap-6 mb-4">
            {submission.runtime !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-medium">{submission.runtime}ms</span>
              </div>
            )}
            {submission.memory !== undefined && (
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <span className="text-sm font-medium">{submission.memory}MB</span>
              </div>
            )}
          </div>

          {/* 错误信息 */}
          {submission.error && (
            <div className="bg-card rounded-lg p-4 mb-4">
              <p className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {submission.error}
              </p>
            </div>
          )}

          {/* 测试用例 */}
          {submission.testCases && submission.testCases.length > 0 && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-sm font-medium mb-3"
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                测试用例 ({submission.testCases.filter(tc => tc.status === 'passed').length}/{submission.testCases.length} 通过)
              </button>

              {isExpanded && (
                <div className="space-y-2">
                  {submission.testCases.map((testCase) => (
                    <div
                      key={testCase.id}
                      className={cn(
                        'bg-card rounded-lg p-3 border',
                        testCase.status === 'passed'
                          ? 'border-status-accepted/20'
                          : 'border-destructive/20'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {testCase.status === 'passed' ? (
                            <CheckCircle className="w-5 h-5 text-status-accepted" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <span className="text-sm font-medium">
                            测试用例 {testCase.id}
                          </span>
                        </div>
                        {testCase.runtime !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {testCase.runtime}ms
                          </span>
                        )}
                      </div>

                      {testCase.status === 'failed' && testCase.error && (
                        <div className="mt-2 text-xs text-destructive">
                          {testCase.error}
                        </div>
                      )}

                      <div className="mt-2 space-y-1">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">输入：</p>
                          <pre className="text-xs bg-muted p-2 rounded font-mono">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">期望输出：</p>
                          <pre className="text-xs bg-muted p-2 rounded font-mono">
                            {testCase.expectedOutput}
                          </pre>
                        </div>
                        {testCase.actualOutput && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">实际输出：</p>
                            <pre className="text-xs bg-muted p-2 rounded font-mono">
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

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-4">
            {currentStatus === 'accepted' && (
              <Button variant="default" size="sm">
                <PartyPopper className="w-4 h-4 mr-1" />
                分享解答
              </Button>
            )}
            {(currentStatus === 'wrong_answer' ||
              currentStatus === 'time_limit_exceeded' ||
              currentStatus === 'memory_limit_exceeded') && (
              <Button variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-1" />
                再试一次
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// 提交结果的加载骨架
export function SubmissionResultSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-3">
        <div className="animate-spin">
          <div className="w-6 h-6 border-2 border-primary rounded-full border-t-transparent"></div>
        </div>
        <div>
          <h3 className="font-semibold">提交中...</h3>
          <p className="text-sm text-muted-foreground">请稍候，正在评测您的解答</p>
        </div>
      </div>
    </div>
  )
}
