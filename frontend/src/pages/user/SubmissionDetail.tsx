import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { problemsService } from '@/services/problems'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getSubmissionStatusConfig } from '@/lib/submissionStatus'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { ArrowLeft, RotateCcw, CheckCircle, XCircle, Clock, Cpu, Code2, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { AiCodeFeedback } from '@/components/analysis/AiCodeFeedback'
import { SimilarSubmissions } from '@/components/analysis/SimilarSubmissions'
import { useAuthStore } from '@/store/authStore'
import { isTeacherOrAbove } from '@/types/auth'

interface TestCase {
  id: number
  input?: string
  expected_output?: string
  actual_output?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  is_hidden?: boolean
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
  show_correct_answer?: boolean
  can_manage_correct_answer?: boolean
  test_cases?: TestCase[]
  created_at: string
  updated_at: string
}

export function SubmissionDetail() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
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

  const visibilityMutation = useMutation({
    mutationFn: (showCorrectAnswer: boolean) =>
      problemsService.updateCorrectAnswerVisibility(submission!.problem_id, showCorrectAnswer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
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
  const canManageCorrectAnswer =
    Boolean(submission.can_manage_correct_answer) ||
    Boolean(user?.role && isTeacherOrAbove(user.role))
  const showCorrectAnswer = submission.show_correct_answer !== false

  const statusPillClass = cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold uppercase tracking-wider border transition-all duration-200 button-press',
    submission.status === 'accepted'
      ? 'bg-status-accepted/10 border-status-accepted/30 text-status-accepted shadow-[0_0_12px_rgba(62,207,142,0.15)]'
      : submission.status === 'wrong_answer'
        ? 'bg-destructive/10 border-destructive/30 text-destructive shadow-[0_0_12px_rgba(239,68,68,0.1)]'
        : submission.status === 'pending' || submission.status === 'queued'
          ? 'bg-status-pending/10 border-status-pending/30 text-status-pending animate-pulse'
          : submission.status === 'time_limit_exceeded'
            ? 'bg-status-tle/10 border-status-tle/30 text-status-tle shadow-[0_0_12px_rgba(245,158,11,0.1)]'
            : submission.status === 'runtime_error'
              ? 'bg-status-re/10 border-status-re/30 text-status-re shadow-[0_0_12px_rgba(239,68,68,0.1)]'
              : 'bg-muted border-border/40 text-muted-foreground'
  )

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Panel */}
      <div className="border border-border/40 rounded-xl bg-background/60 backdrop-blur-xl/60 p-4 shadow-sm glass">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-muted/50 p-2 h-9 w-9 transition button-press"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </Button>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground font-medium">
              <button
                type="button"
                className="hover:text-foreground transition-colors"
                onClick={() => navigate('/problems')}
              >
                题目列表
              </button>
              <span className="text-border-subtle font-normal">/</span>
              <button
                type="button"
                className="hover:text-foreground transition-colors max-w-[200px] truncate"
                onClick={() => navigate(`/problems/${submission.problem_id}`)}
              >
                {submission.problem_title}
              </button>
              <span className="text-border-subtle font-normal">/</span>
              <span className="font-mono text-foreground font-semibold bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                #{submission.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={statusPillClass}>
              {statusConfig.icon === 'check_circle' && <CheckCircle className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'cancel' && <XCircle className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'schedule' && <Clock className="w-3.5 h-3.5" />}
              {statusConfig.icon === 'memory' && <Cpu className="w-3.5 h-3.5" />}
              {statusLabel}
            </div>
            <Link to={`/problems/${submission.problem_id}/solve`}>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-border/40 bg-background/60 backdrop-blur-xl/50 hover:bg-muted transition-all button-press text-[13px] font-semibold px-4 py-2"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                再次挑战
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats row — tight metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Card 1: Verdict */}
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-4 glass-interactive hover-lift transition-card-hover",
          submission.status === 'accepted'
            ? 'border-status-accepted/20 bg-gradient-to-br from-status-accepted/5 to-card shadow-[0_0_15px_rgba(62,207,142,0.05)]'
            : 'border-border/40 bg-background/60 backdrop-blur-xl/60'
        )}>
          <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">判题结果</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn(
              'text-base font-black tracking-tight',
              submission.status === 'accepted' ? 'text-status-accepted' : 'text-foreground'
            )}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Runtime */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl/60 p-4 glass-interactive hover-lift transition-card-hover">
          <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">运行时间</p>
          <p className="mt-2 text-base font-black tracking-tight text-foreground font-mono">
            {submission.time_ms !== undefined ? (
              <>
                {submission.time_ms}
                <span className="text-[13px] font-normal text-muted-foreground ml-0.5">ms</span>
              </>
            ) : '-'}
          </p>
        </div>

        {/* Card 3: Memory */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl/60 p-4 glass-interactive hover-lift transition-card-hover">
          <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">内存占用</p>
          <p className="mt-2 text-base font-black tracking-tight text-foreground font-mono">
            {submission.memory_kb !== undefined ? (
              <>
                {Math.round(submission.memory_kb / 1024 * 10) / 10}
                <span className="text-[13px] font-normal text-muted-foreground ml-0.5">MB</span>
              </>
            ) : '-'}
          </p>
        </div>

        {/* Card 4: Testcases */}
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl/60 p-4 glass-interactive hover-lift transition-card-hover">
          <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">测试用例</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={cn(
              'text-base font-black tracking-tight font-mono',
              passedTestCases === totalTestCases ? 'text-status-accepted' : 'text-foreground'
            )}>
              {passedTestCases}
            </span>
            <span className="text-[13px] font-medium text-muted-foreground">/ {totalTestCases}</span>
          </div>
        </div>
      </div>

      {/* Test Cases — developer-panel style */}
      {submission.test_cases && submission.test_cases.length > 0 && (
        <div className="border border-border/40 rounded-xl bg-background/60 backdrop-blur-xl/60 overflow-hidden shadow-sm glass">
          <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary animate-pulse" />
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                测试用例执行矩阵
              </h3>
            </div>
            <span className="text-[13px] font-mono text-muted-foreground uppercase tracking-wider">
              Matrix view
            </span>
          </div>
          <div className="divide-y divide-border/40">
            {submission.test_cases.map((testCase, index) => {
              const isExpanded = expandedTestCases.has(index)
              const isPassed = testCase.status === 'passed'

              return (
                <div
                  key={testCase.id}
                  className={cn(
                    'transition-all duration-200 border-l-2',
                    isPassed ? 'border-l-status-accepted bg-status-accepted/[0.01]' : 'border-l-destructive bg-destructive/[0.01]',
                    isExpanded ? 'bg-muted/10' : 'hover:bg-muted/5'
                  )}
                >
                  {/* Test Case Header */}
                  <div
                    className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
                    onClick={() => toggleTestCase(index)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-lg border text-[13px] font-bold font-mono',
                        isPassed
                          ? 'bg-status-accepted/10 border-status-accepted/20 text-status-accepted'
                          : 'bg-destructive/10 border-destructive/20 text-destructive'
                      )}>
                        {testCase.id}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        测试用例 #{testCase.id}
                      </span>
                      {testCase.time_ms !== undefined && (
                        <span className="font-mono text-[13px] tabular-nums text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                          {testCase.time_ms} ms
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'rounded-full px-2.5 py-0.5 text-[13px] font-bold tracking-wider uppercase',
                        isPassed
                          ? 'bg-status-accepted/10 text-status-accepted border border-status-accepted/20'
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                      )}>
                        {isPassed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                  </div>

                  {/* Test Case Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-1 space-y-4 border-t border-border/20 animate-slide-down">
                      {!isPassed && testCase.error && (
                        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-[13px] text-destructive font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                          <div className="text-[13px] font-black uppercase tracking-wider text-destructive/80 mb-1">Error Logs:</div>
                          {testCase.error}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">输入数据</p>
                          </div>
                          <pre className="text-[13px] bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl font-mono overflow-x-auto text-zinc-100 shadow-inner max-h-48 leading-relaxed">
                            {testCase.input ?? (testCase.is_hidden ? '隐藏用例不展示输入数据' : '无输入数据')}
                          </pre>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">期望输出</p>
                          </div>
                          <pre className="text-[13px] bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl font-mono overflow-x-auto text-zinc-100 shadow-inner max-h-48 leading-relaxed">
                            {testCase.expected_output ?? (
                              testCase.is_hidden
                                ? '隐藏用例不展示期望输出'
                                : showCorrectAnswer
                                  ? '无期望输出数据'
                                  : '该题当前不展示正确答案'
                            )}
                          </pre>
                        </div>
                      </div>

                      {testCase.actual_output !== undefined && (
                        <div className="space-y-1.5">
                          <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">实际输出</p>
                          <pre className={cn(
                            'text-[13px] p-3.5 rounded-xl font-mono overflow-x-auto border shadow-inner max-h-48 leading-relaxed',
                            testCase.actual_output === testCase.expected_output
                              ? 'bg-status-accepted/5 border-status-accepted/20 text-status-accepted'
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

      {/* Code section & sidebar */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden border border-border/40 rounded-xl bg-background/60 backdrop-blur-xl/60 shadow-sm glass">
          <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-5 py-3">
            <div className="flex items-center gap-3">
              <Code2 className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold tracking-tight text-foreground">提交代码</span>
              <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/50 px-2.5 py-0.5 text-[13px] font-semibold font-mono text-muted-foreground">
                {submission.language}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="rounded-full border-border/40 bg-background/60 backdrop-blur-xl/50 hover:bg-muted transition-all button-press text-[13px] font-semibold px-4 py-2"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-status-accepted animate-scale-in" />
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
          <div className="p-4 bg-zinc-950">
            <div className="relative flex rounded-xl border border-zinc-800/80 bg-black/60 font-mono text-[13px] leading-6 text-zinc-100 shadow-inner overflow-hidden">
              {/* Line Numbers gutter */}
              <div className="hidden sm:block select-none text-right px-4 py-4 bg-zinc-900/30 border-r border-zinc-800/50 text-zinc-600 font-mono text-[13px] text-opacity-50">
                {submission.code.split('\n').map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              {/* Actual Code content */}
              <pre className="flex-1 overflow-x-auto p-4 font-mono text-[13px] leading-6 text-zinc-200">
                <code>{submission.code}</code>
              </pre>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {canManageCorrectAnswer && (
            <div className="border border-border/40 rounded-xl bg-background/60 backdrop-blur-xl/60 p-5 shadow-sm glass">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">
                    正确答案可见性
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                    当前题目全局{showCorrectAnswer ? '展示' : '隐藏'}提交详情中的期望输出。
                  </p>
                </div>
                <span className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-[13px] font-semibold',
                  showCorrectAnswer
                    ? 'border-status-accepted/20 bg-status-accepted/10 text-status-accepted'
                    : 'border-border/50 bg-muted/50 text-muted-foreground'
                )}>
                  {showCorrectAnswer ? '可见' : '隐藏'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={visibilityMutation.isPending}
                onClick={() => visibilityMutation.mutate(!showCorrectAnswer)}
                className="mt-4 w-full rounded-full border-border/40 bg-background/60 backdrop-blur-xl/50 hover:bg-muted transition-all button-press text-[13px] font-semibold px-4 py-2"
              >
                {showCorrectAnswer ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                    隐藏正确答案
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    展示正确答案
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Metadata Sidebar Card */}
          <div className="border border-border/40 rounded-xl bg-background/60 backdrop-blur-xl/60 p-5 shadow-sm glass">
            <h3 className="text-sm font-semibold tracking-tight text-foreground mb-4 flex items-center gap-2">
              <span>提交元数据</span>
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">提交时间</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground font-mono">
                  {new Date(submission.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">更新时间</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground font-mono">
                  {new Date(submission.updated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">提交作者</p>
                <p className="mt-1 text-[13px] font-semibold text-foreground">{submission.username}</p>
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">题目 ID</p>
                <p className="mt-1 text-[13px] font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/30 inline-block">
                  {submission.problem_id}
                </p>
              </div>
              <div>
                <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">提交 ID</p>
                <p className="mt-1 text-[13px] font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/30 inline-block">
                  #{submission.id}
                </p>
              </div>
            </div>
          </div>

          {/* Error message card */}
          {(submission.status === 'compilation_error' ||
            submission.status === 'runtime_error' ||
            submission.status === 'wrong_answer') && submission.error_message && (
            <div className="border border-destructive/20 rounded-xl bg-destructive/5 p-5 shadow-sm glass animate-slide-up">
              <h3 className="text-sm font-semibold tracking-tight text-destructive mb-3">
                错误诊断控制台
              </h3>
              <pre className="text-[13px] text-destructive whitespace-pre-wrap font-mono bg-black/40 p-3 rounded-xl border border-destructive/15 leading-relaxed overflow-x-auto shadow-inner max-h-96">
                {submission.error_message}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* AI Analysis — feedback + similar submissions */}
      {Number.isFinite(Number(submissionId)) && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 animate-slide-up">
          <AiCodeFeedback submissionId={Number(submissionId)} />
          <SimilarSubmissions submissionId={Number(submissionId)} />
        </div>
      )}
    </div>
  )
}
