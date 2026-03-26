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
      toast.success('提交已发送')
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
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4f6ea8]">编程工作区</p>
          <h1 className="mt-5 font-['Manrope'] text-[2.25rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">{problem.title}</h1>
          <div className="mt-5 flex flex-nowrap gap-3 overflow-x-auto pb-1">
            {[
              { label: '时间限制', value: `${problem.time_limit} ms` },
              { label: '内存限制', value: `${Math.round(problem.memory_limit / 1024)} MB` },
              { label: '难度分值', value: String(problem.points) },
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
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">题目描述</h2>
                <div className="mt-3 whitespace-pre-wrap">{problem.description}</div>
              </section>
              {visibleExample ? (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6b7ca7]">示例输入</h2>
                  <div className="mt-3 rounded-[8px] bg-white px-4 py-4 shadow-[0_8px_18px_rgba(19,27,46,0.04)]">
                    <p className="text-sm font-semibold text-[#003d9b]">输入：</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-[#131b2e]">{visibleExample.input}</pre>
                    <p className="mt-4 text-sm font-semibold text-[#006847]">输出：</p>
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8b97b0]">代码编辑台</div>
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

          <div className="h-48 border-t border-[rgba(195,198,214,0.22)] bg-[rgba(242,243,255,0.56)]">
            <div className="flex items-center justify-between gap-3 border-b border-[rgba(195,198,214,0.22)] px-4 py-3">
              <div className="flex items-center gap-4">
                <button type="button" className="text-xs font-bold text-[#003d9b] border-b-2 border-[#003d9b] pb-0.5">
                  运行输出
                </button>
                <button type="button" className="text-xs font-bold text-[#8b97b0] transition-colors">
                  结果面板
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[rgba(226,231,255,0.96)] px-4 py-2 text-xs font-semibold text-[#17305e]"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">play_arrow</span>
                  <span>运行代码</span>
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!code.trim() || submitting}
                  className="inline-flex items-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#003d9b,#0052cc)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(0,61,155,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">gavel</span>
                  <span>提交代码</span>
                </button>
              </div>
            </div>
            <div className="flex h-[calc(100%-57px)] flex-col gap-2 overflow-y-auto bg-slate-900 px-4 py-4 font-mono text-[11px] text-slate-300">
              <div className="flex gap-2">
                <span className="text-slate-500">[工作区]</span>
                <span className="text-[#85f8c4]">等待运行或提交当前代码。</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-500">[输入]</span>
                <span className="text-slate-400">按题目要求使用标准输入输出。</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ProblemIDEEnhanced
