/**
 * Problem IDE with Real-time Updates
 * Integrates WebSocket for live submission status
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MonacoEditor } from '@/components/ide/MonacoEditor'
import { IDELayout } from '@/components/ide/IDELayout'
import { SubmissionResult, SubmissionResultSkeleton } from '@/components/ide/SubmissionResult'
import { problemsService } from '@/services/problems'
import { getCodeTemplate, getLanguageConfig, getAllLanguages } from '@/utils/codeTemplates'
import { useSubmissionUpdates } from '@/hooks/useWebSocket'
import type { SubmissionResult as SubmissionResultType } from '@/components/ide/SubmissionResult'
import toast from 'react-hot-toast'

export function ProblemIDEEnhanced() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()

  const [selectedLanguage, setSelectedLanguage] = useState('cpp')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResultType | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [problem, setProblem] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // WebSocket for real-time updates
  const { update: wsUpdate, isConnected: wsConnected } = useSubmissionUpdates(
    submissionResult?.id ? parseInt(submissionResult.id) : undefined
  )

  // Load problem details
  useEffect(() => {
    const loadProblem = async () => {
      try {
        const data = await problemsService.getProblem(problemId!)
        setProblem(data)
      } catch (error) {
        console.error('Failed to load problem:', error)
        toast.error('Failed to load problem')
      } finally {
        setLoading(false)
      }
    }

    loadProblem()
  }, [problemId])

  // Handle WebSocket updates
  useEffect(() => {
    if (wsUpdate && submissionResult) {
      console.log('WebSocket update received:', wsUpdate)

      // Update submission result with real-time data
      setSubmissionResult((prev) => ({
        ...prev,
        id: wsUpdate.submission_id.toString(),
        status: wsUpdate.status as SubmissionResultType['status'],
        runtime: wsUpdate.runtime_ms,
        memory: wsUpdate.memory_kb ? Math.round(wsUpdate.memory_kb / 1024) : undefined,
      }))

      // Show toast notification for final results
      if (['accepted', 'wrong_answer', 'compile_error', 'runtime_error'].includes(wsUpdate.status)) {
        const statusMessages: Record<string, string> = {
          accepted: '🎉 Accepted! Great job!',
          wrong_answer: '❌ Wrong Answer. Try again!',
          compile_error: '⚠️ Compilation Error. Check your code.',
          runtime_error: '⚠️ Runtime Error.',
        }

        toast(statusMessages[wsUpdate.status] || `Submission: ${wsUpdate.status}`, {
          icon: wsUpdate.status === 'accepted' ? '✅' : 'ℹ️',
        })
      }
    }
  }, [wsUpdate])

  // Supported languages
  const supportedLanguages = getAllLanguages().map((lang) => ({
    id: lang.id,
    name: lang.label,
    icon: lang.icon,
    version: lang.version,
    extension: lang.extension,
  }))

  // Update code template when language changes
  useEffect(() => {
    const template = getCodeTemplate(selectedLanguage)
    if (!code || code.length < 100) {
      setCode(template)
    }
  }, [selectedLanguage])

  const handleLanguageChange = (languageId: string) => {
    setSelectedLanguage(languageId)
    const template = getCodeTemplate(languageId)
    setCode(template)
    setSubmissionResult(null)
    setShowResult(false)
  }

  const handleSubmit = async () => {
    if (!problem || !code.trim()) {
      toast.error('Please write some code before submitting')
      return
    }

    setIsSubmitting(true)
    setShowResult(true)
    setSubmissionResult({
      id: 'temp',
      status: 'pending',
    })

    try {
      // Submit code to API
      const submission = await problemsService.submitCode({
        problemId: problem.id,
        code,
        language: selectedLanguage,
      })

      toast.success('Code submitted! Waiting for results...')

      // Convert API response to component format
      const result: SubmissionResultType = {
        id: submission.id,
        status: submission.status as SubmissionResultType['status'],
        runtime: submission.time_ms,
        memory: submission.memory_kb ? Math.round(submission.memory_kb / 1024) : undefined,
        error: submission.error_message,
        testCases: submission.test_cases?.map((tc: any) => ({
          id: tc.id,
          input: tc.input,
          expectedOutput: tc.expected_output,
          actualOutput: tc.actual_output,
          status: tc.status as 'passed' | 'failed' | 'pending' | 'running',
          error: tc.error,
          runtime: tc.time_ms,
        }))
      }

      setSubmissionResult(result)

      // Subscribe to WebSocket updates for this submission
      if (wsConnected) {
        console.log('Subscribing to updates for submission:', submission.id)
      }
    } catch (error) {
      console.error('Submit error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Submission failed'
      toast.error(errorMessage)

      setSubmissionResult({
        id: 'error',
        status: 'compilation_error',
        error: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseResult = () => {
    setShowResult(false)
    setSubmissionResult(null)
  }

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
      <span className="text-gray-600">
        {wsConnected ? 'Real-time updates active' : 'Connecting...'}
      </span>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading problem...</p>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Problem not found</h2>
        <p className="text-gray-600 mb-4">The problem you're looking for doesn't exist.</p>
        <Link
          to="/problems"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Problems
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <Link
            to={`/problems/${problem.id}`}
            className="text-gray-600 hover:text-gray-900"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Problem Solving IDE
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{problem.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {problem.difficulty}
              </span>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                {problem.time_limit}ms • {problem.memory_limit}MB
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <button
            onClick={() => navigate(`/submissions`)}
            className="hidden items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200 lg:flex"
          >
            <span className="material-symbols-outlined text-base">history</span>
            Submission Archive
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !code.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
          >
            <span className="material-symbols-outlined">
              {isSubmitting ? 'hourglass_empty' : 'play_arrow'}
            </span>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-white px-6 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:grid-cols-3">
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">Workspace</span>
          <p className="mt-1">按 reference 模板整理为题面 + 编辑区 + 结果侧栏结构。</p>
        </div>
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">Language</span>
          <p className="mt-1">当前语言 {getLanguageConfig(selectedLanguage).label}，切换语言时会同步模板代码。</p>
        </div>
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">Realtime</span>
          <p className="mt-1">WebSocket {wsConnected ? '已连接' : '连接中'}，提交后会自动轮询并显示最终状态。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/60 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">IDE Summary</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">工作区摘要</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                当前 IDE 已按 reference 收敛为题面、编辑器、结果侧栏三段式结构。这里把语言、模板和实时连接状态提升到首屏，减少进入编辑器后再找上下文。
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              live judge
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Language</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{getLanguageConfig(selectedLanguage).label}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{code.trim() ? 'Ready' : 'Empty'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Realtime</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">{wsConnected ? 'Connected' : 'Pending'}</p>
          </div>
        </div>
      </div>

      <IDELayout
        problemTitle={problem.title}
        language={selectedLanguage}
        code={code}
        onLanguageChange={handleLanguageChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        timeLimit={problem.time_limit}
        memoryLimit={problem.memory_limit}
        languages={supportedLanguages}
      >
        <MonacoEditor
          language={selectedLanguage}
          value={code}
          onChange={setCode}
          height="100%"
        />
      </IDELayout>

      {/* Submission Result Panel */}
      {showResult && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-xl border-l overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Submission Result</h2>
            <button
              onClick={handleCloseResult}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {submissionResult ? (
            <SubmissionResult result={submissionResult} />
          ) : (
            <SubmissionResultSkeleton />
          )}
        </div>
      )}
    </div>
  )
}
