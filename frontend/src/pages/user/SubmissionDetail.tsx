import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Clock, Cpu, Code2, Copy, Check } from 'lucide-react'

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

  const statusPillClass = cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
    submission.status === 'accepted'
      ? 'bg-status-accepted/10 text-status-accepted'
      : submission.status === 'wrong_answer'
        ? 'bg-destructive/10 text-destructive'
        : submission.status === 'pending' || submission.status === 'queued'
          ? 'bg-status-pending/10 text-status-pending'
          : submission.status === 'time_limit_exceeded'
            ? 'bg-status-tle/10 text-status-tle'
            : submission.status === 'runtime_error'
              ? 'bg-status-re/10 text-status-re'
              : 'bg-muted text-muted-foreground'
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <button type="button" className="hover:text-foreground transition-colors" onClick={() => navigate('/problems')}>
                题目
              </button>
              <span className="text-border">/</span>
              <button type="button" className="hover:text-foreground transition-colors" onClick={() => navigate(`/problems/${submission.problem_id}`)}>
                {submission.problem_title}
              </button>
              <span className="text-border">/</span>
              <span className="font-mono text-foreground">#{submission.id}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className={statusPillClass}>
              {statusConfig.icon === 'check_circle' && <CheckCircle className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'cancel' && <XCircle className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'schedule' && <Clock className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'memory' && <Cpu className="w-3.5 h-3.5" />}
              {statusLabel}
            </div>
            <Link to={`/problems/${submission.problem_id}/solve`}>
              <Button variant="outline" size="sm">
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                再次挑战
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row — tight metric cards */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="border border-border rounded-lg bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">判题结果</p>
          <p className={cn(
            'mt-1 text-base font-semibold tabular-nums',
            submission.status === 'accepted' ? 'text-status-accepted' : 'text-foreground'
          )}>
            {statusLabel}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">运行时间</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground font-mono">
            {submission.time_ms !== undefined ? `${submission.time_ms}ms` : '-'}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">内存占用</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground font-mono">
            {submission.memory_kb !== undefined ? `${Math.round(submission.memory_kb / 1024)}MB` : '-'}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">测试用例</p>
          <p className="mt-1 text-base font-semibold tabular-nums text-foreground">
            <span className={passedTestCases === totalTestCases ? 'text-status-accepted' : ''}>{passedTestCases}</span>
            <span className="text-muted-foreground">/{totalTestCases}</span>
          </p>
        </div>
      </div>

      {/* Test Cases — developer-panel style */}
      {submission.test_cases && submission.test_cases.length > 0 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-whisper">
          <div className="px-4 py-3 border-b border-border-subtle">
            <h3 className="text-sm font-medium text-foreground">
              测试用例详情
            </h3>
          </div>
          <div className="divide-y divide-border-subtle">
            {submission.test_cases.map((testCase, index) => {
              const isExpanded = expandedTestCases.has(index)
              const isPassed = testCase.status === 'passed'

              return (
                <div
                  key={testCase.id}
                  className={cn(
                    isPassed ? '' : ''
                  )}
                >
                  {/* Test Case Header */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleTestCase(index)}
                  >
                    <div className="flex items-center gap-2.5">
                      {isPassed ? (
                        <CheckCircle className="w-4 h-4 text-status-accepted" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        测试用例 {testCase.id}
                      </span>
                      {testCase.time_ms !== undefined && (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {testCase.time_ms}ms
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium',
                      isPassed
                        ? 'bg-[#3ecf8e]/10 text-status-accepted'
                        : 'bg-destructive/10 text-destructive'
                    )}>
                      {isPassed ? '通过' : '失败'}
                    </span>
                  </div>

                  {/* Test Case Details */}
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-2.5">
                      {!isPassed && testCase.error && (
                        <div className="text-xs text-destructive font-mono">
                          {testCase.error}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
                            输入
                          </p>
                          <pre className="text-xs bg-background border border-border p-2.5 rounded-lg font-mono overflow-x-auto text-foreground">
                            {testCase.input}
                          </pre>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
                            期望输出
                          </p>
                          <pre className="text-xs bg-background border border-border p-2.5 rounded-lg font-mono overflow-x-auto text-foreground">
                            {testCase.expected_output}
                          </pre>
                        </div>
                      </div>

                      {testCase.actual_output && (
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-1">
                            实际输出
                          </p>
                          <pre className={cn(
                            'text-xs p-2.5 rounded-lg font-mono overflow-x-auto border',
                            testCase.actual_output === testCase.expected_output
                              ? 'bg-[#3ecf8e]/5 border-[#3ecf8e]/20 text-status-accepted'
                              : 'bg-destructive/5 border-destructive/20 text-destructive'
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

      {/* Code section — terminal/IDE feel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden border border-border rounded-xl bg-card shadow-whisper">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">提交代码</span>
              <span className="text-[11px] font-mono text-muted-foreground">
                {submission.language}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  复制
                </>
              )}
            </Button>
          </div>
          <div className="p-4">
            <pre className="overflow-x-auto rounded-lg bg-zinc-950 border border-zinc-800 p-3 font-mono text-[13px] leading-5 text-zinc-100 shadow-whisper">
              <code>{submission.code}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-3">
          {/* Submission metadata sidebar */}
          <div className="border border-border rounded-xl bg-card p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">提交信息</h3>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">提交时间</p>
                <p className="mt-0.5 text-xs text-foreground">
                  {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">更新时间</p>
                <p className="mt-0.5 text-xs text-foreground">
                  {new Date(submission.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">提交用户</p>
                <p className="mt-0.5 text-xs text-foreground">{submission.username}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">题目 ID</p>
                <p className="mt-0.5 text-xs font-mono text-foreground">{submission.problem_id}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">提交 ID</p>
                <p className="mt-0.5 text-xs font-mono text-foreground">{submission.id}</p>
              </div>
            </div>
          </div>

          {/* Error message if present */}
          {(submission.status === 'compilation_error' ||
            submission.status === 'runtime_error' ||
            submission.status === 'wrong_answer') && submission.error_message && (
            <div className="border border-destructive/20 rounded-xl bg-destructive/5 p-4">
              <h3 className="text-sm font-medium text-destructive mb-2">
                错误信息
              </h3>
              <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
                {submission.error_message}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
