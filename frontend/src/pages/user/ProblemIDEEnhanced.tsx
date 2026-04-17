import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
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
  if (difficulty === 'easy') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (difficulty === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-rose-100 text-rose-700 border-rose-200'
}

export function ProblemIDEEnhanced() {
  const { problemId, contestId } = useParams<{ problemId: string; contestId?: string }>()
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
        const defaultLanguage = enabledLanguages.find((item) => item.is_default)?.id || enabledLanguages[0]?.id || 'python'

        setProblem(problemData)
        setExamples(testCases.filter((item) => !item.is_hidden).slice(0, 3))
        setLanguages(enabledLanguages)
        setSelectedLanguage(defaultLanguage)
        setCode('')
      } catch (error) {
        console.error('Failed to load IDE workspace:', error)
        toast.error('IDE 工作区加载失败')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [problemId])

  const paragraphs = useMemo(() => {
    return (problem?.description || '')
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)
  }, [problem?.description])

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
        ...(contestId ? { contestId } : {}),
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
      <div className="flex min-h-[70vh] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-sm text-slate-500">加载 IDE 工作区...</p>
        </div>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-white px-8 py-16 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">题目不存在</h2>
        <p className="mt-2 text-sm text-slate-600">当前题目无法加载，返回题库重新选择。</p>
        <Link
          to="/problems"
          className="mt-6 inline-flex items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
        >
          返回题库
        </Link>
      </div>
    )
  }

  return (
    <div className="-m-8 overflow-hidden bg-[#eef2f7]">
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="border-b border-slate-200 bg-white xl:border-b-0 xl:border-r">
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-8 py-8">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h1 className="truncate text-[30px] font-semibold tracking-tight text-slate-950">{problem.title}</h1>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${difficultyBadge(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                    <span>{problem.time_limit} ms</span>
                    <span className="text-slate-300">/</span>
                    <span>{Math.round(problem.memory_limit / 1024)} MB</span>
                  </div>
                </div>
                <Link to="/problems" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                  返回题库
                </Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8">
              <div className="space-y-8">
                <article className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Description</h2>
                  <div className="space-y-4 text-sm leading-7 text-slate-700">
                    {paragraphs.length > 0 ? paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>暂无题面描述。</p>}
                  </div>
                </article>

                <section className="space-y-4">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Examples</h2>
                  {examples.length > 0 ? (
                    <div className="space-y-4">
                      {examples.map((example, index) => (
                        <div key={example.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                          <div className="text-sm font-semibold text-slate-950">Sample #{index + 1}</div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Input</div>
                              <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm text-slate-700">{example.input}</pre>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Output</div>
                              <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm text-slate-700">{example.expected_output}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">暂无公开样例。</div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0f172a] text-slate-100">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-end gap-3 border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <label className="sr-only" htmlFor="ide-language-select">Language</label>
                <select
                  id="ide-language-select"
                  aria-label="language"
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none focus:border-blue-500"
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
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
