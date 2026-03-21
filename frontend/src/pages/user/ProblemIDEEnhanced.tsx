import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { problemsService } from '@/services/problems'
import { MonacoEditor } from '@/components/ide/MonacoEditor'
import type { Problem, TestCase } from '@/types/problems'

function difficultyTone(difficulty?: string) {
  if (difficulty === 'hard') return 'bg-[#ffdad6] text-[#93000a]'
  if (difficulty === 'medium') return 'bg-[#d5e3fc] text-[#244171]'
  return 'bg-[#e4f7ee] text-[#006847]'
}

export function ProblemIDEEnhanced() {
  const { problemId = '' } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [languages, setLanguages] = useState<Array<{ id: string; name: string; extension: string; enabled: boolean; is_default: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        const [problemData, cases, languageData] = await Promise.all([
          problemsService.getProblem(problemId),
          problemsService.getTestCases(problemId),
          problemsService.getSupportedLanguages(),
        ])

        if (cancelled) {
          return
        }

        setProblem(problemData)
        setTestCases(cases)
        setLanguages(languageData)
        const defaultLanguage = languageData.find((item) => item.enabled && item.is_default) || languageData.find((item) => item.enabled)
        setLanguage(defaultLanguage?.id || 'python')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [problemId])

  const visibleExample = useMemo(
    () => testCases.find((item) => !item.is_hidden),
    [testCases],
  )

  const handleSubmit = async () => {
    if (!code.trim()) {
      return
    }

    try {
      setSubmitting(true)
      const submission = await problemsService.submitCode({ problemId, code, language })
      toast.success('Judge 已提交')
      navigate(`/submissions/${submission.id}`)
    } catch {
      toast.error('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !problem) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <div className="rounded-[10px] bg-white/92 px-6 py-8 text-sm text-[#6b7ca7] shadow-[0_18px_42px_rgba(19,27,46,0.05)]">
          页面加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto h-[calc(100vh-96px)] max-w-[1440px] px-4 py-6 md:px-8">
      <div className="grid h-full gap-4 overflow-hidden rounded-[10px] bg-white/94 shadow-[0_24px_60px_rgba(19,27,46,0.06)] xl:grid-cols-[0.78fr_1.12fr]">
        <section className="flex min-h-0 flex-col bg-[rgba(242,243,255,0.72)] px-6 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${difficultyTone(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
            <span className="text-xs font-mono text-[#6b7ca7]">ID: {problem.id}</span>
          </div>
          <h1 className="mt-5 font-['Manrope'] text-[2.25rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{problem.title}</h1>
          <div className="mt-5 flex flex-nowrap gap-3 overflow-x-auto pb-1">
            {[
              { label: 'Time Limit', value: `${problem.time_limit} ms` },
              { label: 'Memory Limit', value: `${Math.round(problem.memory_limit / 1024)} MB` },
              { label: 'Difficulty Points', value: String(problem.points) },
            ].map((item) => (
              <div key={item.label} className="min-w-fit rounded-[8px] bg-white px-4 py-3 shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-[#131b2e]">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-6 text-[15px] leading-8 text-[#4f5f7b]">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Description</h2>
                <div className="mt-3 whitespace-pre-wrap">{problem.description}</div>
              </section>
              {visibleExample ? (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">Example Test Case</h2>
                  <div className="mt-3 rounded-[8px] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                    <p className="text-sm font-semibold text-[#003d9b]">Input:</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-[#131b2e]">{visibleExample.input}</pre>
                    <p className="mt-4 text-sm font-semibold text-[#006847]">Output:</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-[#131b2e]">{visibleExample.expected_output}</pre>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-col bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[rgba(195,198,214,0.22)] px-4 py-3">
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="ide-language">Language</label>
              <select
                id="ide-language"
                aria-label="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-[8px] bg-[rgba(242,243,255,0.88)] px-3 py-2 text-sm font-semibold text-[#17305e] outline-none"
              >
                {languages.filter((item) => item.enabled).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b97b0]">Judge Flow</div>
          </div>

          <div className="min-h-0 flex-1">
            <MonacoEditor
              language={language}
              value={code}
              onChange={setCode}
              height="100%"
              theme="light"
              minimap={false}
              lineHeight={23}
              fontSize={14}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[rgba(195,198,214,0.22)] bg-[rgba(242,243,255,0.56)] px-4 py-3">
            <div className="text-sm text-[#65748d]">IDE 界面只保留题面和代码区，提交按标准输入输出走。</div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!code.trim() || submitting}
              className="inline-flex items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(0,61,155,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">gavel</span>
              <span>Judge</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProblemIDEEnhanced
