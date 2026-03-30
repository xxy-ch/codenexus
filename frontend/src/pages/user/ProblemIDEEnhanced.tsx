import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { problemsService } from '@/services/problems'
import { MonacoEditor } from '@/components/ide/MonacoEditor'
import { Button } from '@/components/ui/Button'
import { DifficultyBadge, StatusBadge } from '@/components/ui/StatusBadge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { cn } from '@/lib/utils'
import type { Problem, TestCase } from '@/types/problems'

function ProblemIDEContent() {
  const { problemId = '' } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [languages, setLanguages] = useState<Array<{ id: string; name: string; extension: string; enabled: boolean; is_default: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [panelTab, setPanelTab] = useState<'output' | 'results'>('output')
  const [panelLines, setPanelLines] = useState<string[]>([
    '[Workspace] Ready to run or submit code.',
    '[Input] Use standard input/output as required.',
  ])

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
      } catch {
        if (!cancelled) {
          setPanelLines([
            '[Error] Failed to load problem data.',
            '[Workspace] Please refresh the page or try again later.',
          ])
        }
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
      toast.error('Please enter some code before submitting')
      return
    }

    try {
      setSubmitting(true)
      const submission = await problemsService.submitCode({ problemId, code, language })
      setPanelTab('results')
      setPanelLines([
        `[Submit] Submission #${submission.id} created`,
        `[Status] ${submission.status ?? 'queued'}`,
        '[Note] View submission details for complete results.',
      ])
      toast.success('Submission sent successfully')
      navigate(`/submissions/${submission.id}`)
    } catch {
      setPanelTab('results')
      setPanelLines([
        '[Submit] Submission failed',
        '[Note] Unable to create submission. Please try again.',
      ])
      toast.error('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error('Please enter some code before running')
      return
    }

    try {
      setSubmitting(true)
      const submission = await problemsService.submitCode({ problemId, code, language })
      setPanelTab('output')
      setPanelLines([
        `[Run] Execution task #${submission.id} created`,
        `[Status] ${submission.status ?? 'queued'}`,
        '[Note] Results will be available in submission details.',
      ])
      toast.success('Run task created successfully')
    } catch {
      setPanelTab('output')
      setPanelLines([
        '[Run] Failed to start execution',
        '[Note] Unable to create run task. Please try again.',
      ])
      toast.error('Run failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingState message="Loading problem..." />
  }

  if (!problem) {
    return <ErrorState title="Problem not found" message="Please check the problem ID and try again." />
  }

  return (
    <div className="mx-auto h-[calc(100vh-96px)] max-w-[1440px] px-4 py-6 md:px-8">
      <div className="grid h-full gap-4 overflow-hidden rounded-xl bg-white/94 shadow-panel xl:grid-cols-[0.78fr_1.12fr]">
        {/* Left Panel: Problem Description */}
        <section className="flex min-h-0 flex-col bg-surface-container-low px-6 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <DifficultyBadge difficulty={problem.difficulty} />
            <span className="text-xs font-mono text-on-surface-variant">ID: {problem.id}</span>
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            Programming Workspace
          </p>

          <h1 className="mt-5 font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {problem.title}
          </h1>

          <div className="mt-5 flex flex-nowrap gap-3 overflow-x-auto pb-1">
            {[
              { label: 'Time Limit', value: `${problem.time_limit} ms` },
              { label: 'Memory Limit', value: `${Math.round(problem.memory_limit / 1024)} MB` },
              { label: 'Points', value: String(problem.points) },
            ].map((item) => (
              <div key={item.label} className="min-w-fit rounded-lg bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-6 text-base leading-8 text-on-surface-variant">
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                  Description
                </h2>
                <div className="mt-3 whitespace-pre-wrap">{problem.description}</div>
              </section>

              {visibleExample ? (
                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                    Sample Input
                  </h2>
                  <div className="mt-3 rounded-lg bg-white px-4 py-4 shadow-sm">
                    <p className="text-sm font-semibold text-primary">Input:</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-on-surface">
                      {visibleExample.input}
                    </pre>
                    <p className="mt-4 text-sm font-semibold text-tertiary">Output:</p>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-on-surface">
                      {visibleExample.expected_output}
                    </pre>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </section>

        {/* Right Panel: Code Editor */}
        <section className="flex min-h-0 flex-col bg-white">
          {/* Editor Header */}
          <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="ide-language">
                Language
              </label>
              <select
                id="ide-language"
                aria-label="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-lg bg-surface-container-low px-3 py-2 text-sm font-semibold text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              >
                {languages.filter((item) => item.enabled).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Code Editor
            </div>
          </div>

          {/* Monaco Editor */}
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

          {/* Bottom Panel: Output/Results */}
          <div className="h-48 border-t border-outline-variant/10 bg-surface-container-low/50">
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/10 px-4 py-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setPanelTab('output')}
                  className={cn(
                    'text-xs font-bold pb-0.5 transition-colors',
                    panelTab === 'output' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  Output
                </button>
                <button
                  type="button"
                  onClick={() => setPanelTab('results')}
                  className={cn(
                    'text-xs font-bold pb-0.5 transition-colors',
                    panelTab === 'results' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  Results
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={handleRun}
                  disabled={!code.trim() || submitting}
                  variant="secondary"
                  size="sm"
                  leftIcon={<span className="material-symbols-outlined text-base">play_arrow</span>}
                >
                  Run
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!code.trim() || submitting}
                  variant="gradient"
                  size="sm"
                  leftIcon={<span className="material-symbols-outlined text-lg">gavel</span>}
                >
                  Submit
                </Button>
              </div>
            </div>
            <div className="flex h-[calc(100%-57px)] flex-col gap-2 overflow-y-auto bg-slate-900 px-4 py-4 font-mono text-xs text-slate-300">
              {panelLines.map((line) => {
                const match = line.match(/^(\[[^\]]+\])\s?(.*)$/)
                const label = match?.[1] ?? '[Status]'
                const content = match?.[2] ?? line
                return (
                  <div key={line} className="flex gap-2">
                    <span className="text-slate-500">{label}</span>
                    <span className={panelTab === 'output' ? 'text-tertiary-fixed-dim' : 'text-slate-300'}>
                      {content}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export function ProblemIDEEnhanced() {
  const { problemId = '' } = useParams()

  if (!problemId) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <ErrorState
          title="No problem selected"
          message="Please select a problem from the problem list first."
          action={{
            label: 'Go to Problems',
            onClick: () => (window.location.href = '/problems'),
          }}
        />
      </div>
    )
  }

  return <ProblemIDEContent />
}

export default ProblemIDEEnhanced
