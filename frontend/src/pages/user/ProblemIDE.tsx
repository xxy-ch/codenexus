import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { MonacoEditor } from '@/components/ide/MonacoEditor'
import { IDELayout } from '@/components/ide/IDELayout'
import { SubmissionResult, SubmissionResultSkeleton } from '@/components/ide/SubmissionResult'
import { problemsService, mockProblems } from '@/services/problems'
import { getCodeTemplate, getLanguageConfig, getAllLanguages } from '@/utils/codeTemplates'
import type { SubmissionResult } from '@/components/ide/SubmissionResult'

export function ProblemIDE() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()

  const [selectedLanguage, setSelectedLanguage] = useState('cpp')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  // 获取题目信息
  const problem = mockProblems.find((p) => p.id === problemId)

  // 支持的语言列表
  const supportedLanguages = getAllLanguages()

  // 当语言改变时更新代码模板
  useEffect(() => {
    const template = getCodeTemplate(selectedLanguage)
    if (!code || code.length < 100) { // 只有当代码很短时才自动应用模板
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
    if (!problem || !code.trim()) return

    setIsSubmitting(true)
    setShowResult(true)
    setSubmissionResult({
      id: 'temp',
      status: 'pending',
    })

    try {
      // 实现真实的代码提交
      const submission = await problemsService.submitCode({
        problemId: problem.id,
        code,
        language: selectedLanguage,
      })

      // 将API响应转换为组件期望的格式
      const result: SubmissionResult = {
        id: submission.id,
        status: submission.status as SubmissionResult['status'],
        runtime: submission.time_ms,
        memory: submission.memory_kb ? Math.round(submission.memory_kb / 1024) : undefined,
        error: submission.error_message,
        testCases: submission.test_cases?.map(tc => ({
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
    } catch (error) {
      console.error('Submit error:', error)
      setSubmissionResult({
        id: 'error',
        status: 'compilation_error',
        error: error instanceof Error ? error.message : 'Submission failed',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseResult = () => {
    setShowResult(false)
    setSubmissionResult(null)
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Problem Not Found
        </h3>
        <Link to="/problems">
          <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors">
            Back to Problems
          </button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Submission Result Modal */}
      {showResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full">
            {submissionResult ? (
              <SubmissionResult
                submission={submissionResult}
                onClose={handleCloseResult}
              />
            ) : (
              <SubmissionResultSkeleton />
            )}
          </div>
        </div>
      )}

      {/* Monaco Editor with Layout */}
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <IDELayout
          problemTitle={problem.title}
          problemId={problem.id}
          language={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          code={code}
          onCodeChange={setCode}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          timeLimit={problem.time_limit}
          memoryLimit={problem.memory_limit / 1024} // 转换为MB
          languages={supportedLanguages}
        >
          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor
              language={selectedLanguage}
              value={code}
              onChange={setCode}
              height="100%"
              theme="vs-dark"
              readOnly={isSubmitting}
              fontSize={14}
              minimap={true}
              wordWrap="off"
              codeTemplates={{}}
            />
          </div>
        </IDELayout>
      </div>
    </div>
  )
}
