import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronRight, Clock3, Database } from 'lucide-react'
import { MonacoEditor } from '@/components/ide/MonacoEditor'
import { problemsService } from '@/services/problems'
import type { Problem, TestCase } from '@/types/problems'

interface SupportedLanguageOption {
  id: string
  name: string
  extension: string
  enabled: boolean
  is_default: boolean
}

function difficultyBadge(difficulty: string) {
  if (difficulty === 'easy') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (difficulty === 'medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

export function ProblemIDEEnhanced() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [examples, setExamples] = useState<TestCase[]>([])
  const [languages, setLanguages] = useState<SupportedLanguageOption[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      if (!problemId) return
      setLoading(true)
      try {
        const [problemData, testCases, supportedLanguages] = await Promise.all([
          problemsService.getProblem(problemId),
          problemsService.getTestCases(problemId),
          problemsService.getSupportedLanguages(),
        ])

        if (!active) return

        const enabledLanguages = supportedLanguages.filter((item) => item.enabled)
        const defaultLanguage =
          enabledLanguages.find((item) => item.is_default)?.id || enabledLanguages[0]?.id || 'python'

        setProblem(problemData)
        setExamples(testCases.filter((item) => !item.is_hidden).slice(0, 3))
        setLanguages(enabledLanguages)
        setSelectedLanguage(defaultLanguage)
        setCode('')
      } catch (error) {
        console.error('Failed to load IDE workspace:', error)
        toast.error('IDE 工作区加载失败')
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [problemId])

  const paragraphs = useMemo(
    () =>
      (problem?.description || '')
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean),
    [problem?.description],
  )

  const handleJudge = async () => {
    if (!problem) return
    if (!code.trim()) {
      toast.error('代码不能为空')
      return
    }

    setIsSubmitting(true)
    try {
      const submission = await problemsService.submitCode({
        problemId: String(problem.id),
        code,
        language: selectedLanguage,
      })
      toast.success('提交成功，正在跳转到判题详情')
      navigate(`/submissions/${submission.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center rounded-[32px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,249,253,0.92))] shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="mt-4 text-sm text-slate-500">加载 IDE 工作区...</p>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="rounded-[32px] border border-rose-200 bg-[rgba(255,255,255,0.94)] px-8 py-16 text-center shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <h2 className="text-2xl font-semibold text-slate-950">题目不存在</h2>
        <p className="mt-2 text-sm text-slate-600">当前题目无法加载，返回题库重新选择。</p>
        <Link
          to="/problems"
          className="mt-6 inline-flex items-center rounded-2xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(30,64,175,0.18)]"
        >
          返回题库
        </Link>
      </div>
    )
  }

  return (
    <div className="-m-8 overflow-hidden bg-[rgb(var(--page-bg-rgb))]">
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <section className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(246,249,253,0.92))] xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200/80 px-8 py-7">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                <span>Problems</span>
                <ChevronRight className="h-4 w-4" />
                <span className="truncate font-medium text-slate-900">{problem.title}</span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate text-[30px] font-semibold tracking-tight text-slate-950">
                    {problem.title}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${difficultyBadge(problem.difficulty)}`}
                    >
                      {problem.difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      {problem.time_limit} ms
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Database className="h-3.5 w-3.5" />
                      {Math.round(problem.memory_limit / 1024)} MB
                    </span>
                  </div>
                </div>
                <Link
                  to={`/problems/${problem.id}`}
                  className="rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.86)] px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:border-blue-200 hover:bg-blue-50/80"
                >
                  返回题面
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8">
              <div className="space-y-8">
                <article className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Description
                  </h2>
                  <div className="space-y-4 text-sm leading-7 text-slate-700">
                    {paragraphs.length > 0 ? (
                      paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                    ) : (
                      <p>暂无题面描述。</p>
                    )}
                  </div>
                </article>

                <section className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Examples
                  </h2>
                  {examples.length > 0 ? (
                    <div className="space-y-4">
                      {examples.map((example, index) => (
                        <div
                          key={example.id}
                          className="rounded-[28px] border border-slate-200/90 bg-[rgba(246,249,253,0.92)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                        >
                          <div className="text-sm font-semibold text-slate-950">
                            Sample #{index + 1}
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Input
                              </div>
                              <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] p-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                                {example.input}
                              </pre>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Output
                              </div>
                              <pre className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] p-4 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
                                {example.expected_output}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-dashed border-slate-300 bg-[rgba(246,249,253,0.9)] p-6 text-sm text-slate-500">
                      暂无公开样例。
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#0f172a,#111c33)] text-slate-100">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Code
                </p>
                <p className="mt-1 text-sm text-slate-300">直接编写并提交，无模板预填。</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor="ide-language-select">
                  Language
                </label>
                <select
                  id="ide-language-select"
                  aria-label="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300"
                >
                  {languages.map((language) => (
                    <option key={language.id} value={language.id}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleJudge}
                  disabled={isSubmitting}
                  className="rounded-2xl bg-blue-200 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_24px_rgba(148,163,184,0.12)] transition hover:bg-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Judging...' : 'Judge'}
                </button>
              </div>
            </div>

            <div className="flex-1">
              <MonacoEditor
                language={selectedLanguage}
                value={code}
                onChange={setCode}
                height="100%"
                theme="vs-dark"
                readOnly={isSubmitting}
                fontSize={15}
                minimap={true}
                wordWrap="off"
                lineHeight={22}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
