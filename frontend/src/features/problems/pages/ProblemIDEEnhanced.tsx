import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MonacoEditor } from '@/features/problems/components/MonacoEditor'
import { ConsolePanel } from '@/features/problems/components/ConsolePanel'
import { problemsService } from '@/features/problems/services/problems'
import { IDESkeleton } from '@/features/problems/components/IDESkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { AmbientBackground } from '@/shared/layouts/AmbientBackground'
import type { Problem, TestCase } from '@/features/problems/types/problems'
import {
  Play,
  History,
  FileText,
  Code2,
  Cpu,
  Database,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useSubmissionPolling, verdictLabel, verdictColor } from '@/features/problems/hooks/useSubmissionPolling'

interface SupportedLanguageOption {
  id: string
  name: string
  extension: string
  enabled: boolean
  is_default: boolean
}

function difficultyColorText(difficulty: string) {
  if (difficulty === 'easy') return 'text-[#10b981]'
  if (difficulty === 'medium') return 'text-difficulty-medium'
  return 'text-difficulty-hard'
}

export function ProblemIDEEnhanced() {
  const { problemId, contestId } = useParams<{ problemId: string; contestId?: string }>()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [examples, setExamples] = useState<TestCase[]>([])
  const [languages, setLanguages] = useState<SupportedLanguageOption[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)

  // Layout State
  const [leftTab, setLeftTab] = useState<'description' | 'history'>('description')
  const [consoleOpen, setConsoleOpen] = useState(false)

  // Submission polling — all logic extracted to the hook
  const {
    activeSubmissionId,
    submissionResult,
    isPolling,
    isSubmitting,
    recentSubmissions,
    loadRecentSubmissions,
    submitCode,
  } = useSubmissionPolling()

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
        loadRecentSubmissions(problemId)
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
  }, [problemId, loadRecentSubmissions])

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

    setConsoleOpen(true)
    await submitCode({
      problemId: String(problem.id),
      code,
      language: selectedLanguage,
      ...(contestId ? { contestId } : {}),
    })
  }

  if (loading) {
    return <IDESkeleton />
  }

  if (!problem) {
    return (
      <InlineError
        title="加载失败"
        message="当前题目无法加载，请返回题库重新选择"
      />
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-transparent font-sans text-foreground relative">
      <AmbientBackground />
      {/* Top Premium IDE Header Bar - Frosted Glass */}
      <header className="h-[52px] border-b border-border/40 bg-background/60 backdrop-blur-xl flex items-center justify-between px-4 flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/problems"
            className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="返回题库"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </Link>
          <div className="h-5 w-px bg-border/50" />
          <h1 className="truncate text-[14px] font-semibold tracking-tight text-foreground max-w-[200px] md:max-w-xs flex items-center gap-3">
            {problem.title}
            <span className={cn(
              "text-[13px] font-medium",
              difficultyColorText(problem.difficulty)
            )}>
              {problem.difficulty === 'easy' ? '简单' : problem.difficulty === 'medium' ? '中等' : '困难'}
            </span>
          </h1>
        </div>

        {/* Middle/Right Controls: Language and actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="h-8 rounded-md border border-border/50 bg-background/50 px-2 text-[13px] text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
            >
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleJudge}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground disabled:opacity-50 transition-all hover:opacity-90 active:scale-95 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
            {isSubmitting ? '评测中...' : '提交代码'}
          </button>
        </div>
      </header>

      {/* Main Split Workarea */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Left Side Panel - Frosted Glass */}
        <div className="w-full lg:w-[45vw] min-w-[360px] max-w-[800px] border-r border-border/40 bg-background/60 backdrop-blur-xl flex flex-col overflow-hidden flex-shrink-0">
          {/* Tab switcher */}
          <div className="h-12 border-b border-border/40 flex items-center px-3 gap-2 flex-shrink-0">
            <button
              onClick={() => setLeftTab('description')}
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium transition-all rounded-md flex items-center gap-2",
                leftTab === 'description'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <FileText className="w-4 h-4" />
              题目描述
            </button>
            <button
              onClick={() => setLeftTab('history')}
              className={cn(
                "px-3 py-1.5 text-[13px] font-medium transition-all rounded-md flex items-center gap-2",
                leftTab === 'history'
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <History className="w-4 h-4" />
              提交记录
              {recentSubmissions.length > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[11px] font-semibold ml-1",
                  leftTab === 'history' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {recentSubmissions.length}
                </span>
              )}
            </button>
          </div>

          {/* Left panel Content */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {leftTab === 'description' ? (
              <div className="space-y-8">
                {/* Specs list */}
                <div className="flex items-center gap-6 pb-5 border-b border-border/30">
                  <div className="flex items-center gap-2 text-[13px]">
                    <Clock className="w-[18px] h-[18px] text-muted-foreground" />
                    <span className="text-muted-foreground">时间限制:</span>
                    <span className="font-mono text-foreground">{problem.time_limit} ms</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Database className="w-[18px] h-[18px] text-muted-foreground" />
                    <span className="text-muted-foreground">内存限制:</span>
                    <span className="font-mono text-foreground">{Math.round(problem.memory_limit / 1024)} MB</span>
                  </div>
                </div>

                {/* Description Text */}
                <article className="space-y-4 text-[14px] leading-[1.8] text-foreground/90">
                  {paragraphs.length > 0 ? paragraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>) : <p>暂无题面描述。</p>}
                </article>

                {/* Examples */}
                <section className="space-y-5 pt-2">
                  <h2 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    样例展示
                  </h2>
                  {examples.length > 0 ? (
                    <div className="space-y-6">
                      {examples.map((example, index) => (
                        <div key={example.id} className="space-y-3">
                          <h3 className="text-[13px] font-medium text-foreground">样例 {index + 1}</h3>
                          <div className="rounded-lg border border-border/40 overflow-hidden bg-muted/20">
                            <div className="px-4 py-2 border-b border-border/40 bg-muted/30 text-[12px] font-medium text-muted-foreground">输入</div>
                            <pre className="p-4 text-[13px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">{example.input}</pre>
                            <div className="px-4 py-2 border-y border-border/40 bg-muted/30 text-[12px] font-medium text-muted-foreground">输出</div>
                            <pre className="p-4 text-[13px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">{example.expected_output}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-[13px] text-muted-foreground">暂无公开样例。</div>
                  )}
                </section>
              </div>
            ) : (
              /* Submissions History list */
              <div className="space-y-4">
                {recentSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {recentSubmissions.map((sub) => (
                      <div
                        key={sub.id}
                        className="rounded-lg border border-border/40 bg-muted/10 p-4 hover:border-border/60 transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "text-[13px] font-semibold flex items-center gap-1.5",
                              verdictColor(sub.status)
                            )}>
                              {sub.status === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                              {verdictLabel(sub.status).split(' ')[0]}
                            </span>
                          </div>
                          <div className="text-[12px] text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()} {new Date(sub.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-4 text-[13px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Code2 className="w-3.5 h-3.5" />
                              <span className="font-mono">{sub.language}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5" />
                              <span className="font-mono">{sub.time_ms !== undefined ? `${sub.time_ms} ms` : '-- ms'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setCode(sub.code)
                                setSelectedLanguage(sub.language)
                                toast.success('已载入历史提交代码')
                              }}
                              className="text-[12px] font-medium text-primary hover:text-primary-foreground hover:bg-primary transition-colors px-3 py-1.5 bg-primary/10 rounded-md transition-all"
                            >
                              载入代码
                            </button>
                            <Link
                              to={`/submissions/${sub.id}`}
                              className="text-[12px] font-medium text-foreground hover:bg-muted transition-colors px-3 py-1.5 bg-background border border-border/40 rounded-md shadow-sm"
                            >
                              详情
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/40 p-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
                      <History className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-[13px] text-muted-foreground">您在此题还没有提交过代码。</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel: Monaco Editor & Console Drawer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0A0A0A]">
          {/* Editor Container - Solid Dark Theme for Focus */}
          <div className="flex-1 overflow-hidden relative">
            <MonacoEditor
              language={selectedLanguage}
              value={code}
              onChange={setCode}
              height="100%"
              theme="custom-dark"
              readOnly={isSubmitting}
              fontSize={14}
              minimap={true}
              wordWrap="off"
              lineHeight={24}
            />
          </div>

          {/* Console Drawer — extracted to ConsolePanel component */}
          <ConsolePanel
            consoleOpen={consoleOpen}
            onToggleConsole={() => setConsoleOpen((prev) => !prev)}
            activeSubmissionId={activeSubmissionId}
            isPolling={isPolling}
            submissionResult={submissionResult}
          />
        </div>
      </div>
    </div>
  )
}
