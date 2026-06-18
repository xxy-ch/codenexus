import { useEffect, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { problemsService } from '@/features/problems/services/problems'
import { isSubmissionTerminal } from '@/shared/lib/submissionStatus'
import type { ProblemSubmission } from '@/features/problems/types/problems'

export function verdictLabel(status: ProblemSubmission['status']) {
  switch (status) {
    case 'accepted': return '通过 (Accepted)'
    case 'wrong_answer': return '解答错误 (Wrong Answer)'
    case 'time_limit_exceeded': return '超出时间限制 (Time Limit Exceeded)'
    case 'memory_limit_exceeded': return '超出内存限制 (Memory Limit Exceeded)'
    case 'compilation_error': return '编译错误 (Compilation Error)'
    case 'runtime_error': return '运行错误 (Runtime Error)'
    case 'system_error': return '系统错误 (System Error)'
    case 'failed': return '评测失败 (Failed)'
    case 'pending': return '等待中 (Pending)'
    case 'queued': return '队列中 (Queued)'
    case 'running': return '运行中 (Running)'
    case 'judged': return '已评测 (Judged)'
    default: return '未知状态'
  }
}

export function verdictColor(status: ProblemSubmission['status']) {
  switch (status) {
    case 'accepted': return 'text-[#10b981]'
    case 'wrong_answer': return 'text-[#ef4444]'
    case 'time_limit_exceeded':
    case 'memory_limit_exceeded':
      return 'text-[#f59e0b]'
    case 'compilation_error':
    case 'runtime_error':
      return 'text-[#8b5cf6]'
    default:
      return 'text-muted-foreground'
  }
}

interface UseSubmissionPollingResult {
  activeSubmissionId: string | null
  submissionResult: ProblemSubmission | null
  isPolling: boolean
  isSubmitting: boolean
  recentSubmissions: ProblemSubmission[]
  setActiveSubmissionId: (id: string | null) => void
  setRecentSubmissions: (subs: ProblemSubmission[]) => void
  startPolling: (submissionId: string) => void
  loadRecentSubmissions: (problemId: string) => Promise<void>
  submitCode: (params: { problemId: string; code: string; language: string; contestId?: string }) => Promise<void>
  setIsSubmitting: (v: boolean) => void
}

export function useSubmissionPolling(): UseSubmissionPollingResult {
  const queryClient = useQueryClient()
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null)
  const [submissionResult, setSubmissionResult] = useState<ProblemSubmission | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recentSubmissions, setRecentSubmissions] = useState<ProblemSubmission[]>([])

  const loadRecentSubmissions = useCallback(async (problemId: string) => {
    try {
      const res = await problemsService.getUserSubmissions({ problemId, limit: 10 })
      setRecentSubmissions(res.submissions)
    } catch (err) {
      console.error('Failed to load recent submissions:', err)
    }
  }, [])

  useEffect(() => {
    if (!activeSubmissionId || !isPolling) return

    let active = true
    const pollInterval = setInterval(poll, 1500)

    async function poll() {
      try {
        const detail = await problemsService.getSubmissionDetail(activeSubmissionId)
        if (!active) return

        setSubmissionResult(detail)

        if (isSubmissionTerminal(detail.status)) {
          setIsPolling(false)
          setIsSubmitting(false)
          toast.success(`评测结束: ${verdictLabel(detail.status).split(' ')[0]}`)
          queryClient.invalidateQueries({ queryKey: ['submissions'] })
          queryClient.invalidateQueries({ queryKey: ['problem-submissions'] })
        }
      } catch (error) {
        console.error('Failed to poll submission status:', error)
      }
    }

    poll()

    return () => {
      active = false
      clearInterval(pollInterval)
    }
  }, [activeSubmissionId, isPolling, queryClient])

  const startPolling = useCallback((submissionId: string) => {
    setActiveSubmissionId(submissionId)
    setSubmissionResult(null)
    setIsPolling(true)
  }, [])

  const submitCode = useCallback(async (params: { problemId: string; code: string; language: string; contestId?: string }) => {
    setIsSubmitting(true)
    setSubmissionResult(null)
    setActiveSubmissionId(null)

    try {
      const submission = await problemsService.submitCode(params)
      toast.success('代码已提交，评测开始')
      startPolling(submission.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败'
      toast.error(message)
      setIsSubmitting(false)
    }
  }, [startPolling])

  return {
    activeSubmissionId,
    submissionResult,
    isPolling,
    isSubmitting,
    recentSubmissions,
    setActiveSubmissionId,
    setRecentSubmissions,
    startPolling,
    loadRecentSubmissions,
    submitCode,
    setIsSubmitting,
  }
}
