import { Link } from 'react-router-dom'
import {
  Terminal as TerminalIcon,
  ChevronUp,
  ChevronDown,
  FileText,
  Code2,
  Cpu,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ProblemSubmission } from '@/features/problems/types/problems'
import { verdictLabel, verdictColor } from '@/features/problems/hooks/useSubmissionPolling'

interface ConsolePanelProps {
  consoleOpen: boolean
  onToggleConsole: () => void
  activeSubmissionId: string | null
  isPolling: boolean
  submissionResult: ProblemSubmission | null
}

export function ConsolePanel({
  consoleOpen,
  onToggleConsole,
  activeSubmissionId,
  isPolling,
  submissionResult,
}: ConsolePanelProps) {
  return (
    <div
      className={cn(
        'border-t border-border/40 bg-background/80 backdrop-blur-xl flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex-shrink-0 z-10',
        consoleOpen ? 'h-[320px]' : 'h-12'
      )}
    >
      {/* Console Header Bar */}
      <div
        onClick={onToggleConsole}
        className="h-12 px-4 flex items-center justify-between border-b border-border/40 cursor-pointer select-none hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <TerminalIcon className="w-4 h-4" />
          <span className="text-[13px] font-medium">执行控制台</span>
          {isPolling && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-2" />}
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/50">
          {consoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Console Body */}
      {consoleOpen && (
        <div className="flex-1 overflow-y-auto p-6 font-sans">
          {!activeSubmissionId ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <TerminalIcon className="w-8 h-8 opacity-20 mb-3" />
              <p className="text-[13px]">等待代码提交... 点击右上角的「提交代码」开始评测。</p>
            </div>
          ) : isPolling ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-[13px] text-foreground font-medium mb-1">正在运行评测...</p>
              <p className="text-[12px] text-muted-foreground">
                当前状态: {submissionResult ? verdictLabel(submissionResult.status) : '分配节点'}
              </p>
            </div>
          ) : submissionResult ? (
            <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
              {/* Status header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'text-[16px] font-bold flex items-center gap-2',
                      verdictColor(submissionResult.status)
                    )}
                  >
                    {submissionResult.status === 'accepted' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                    {verdictLabel(submissionResult.status)}
                  </span>
                </div>
                <Link
                  to={`/submissions/${submissionResult.id}`}
                  className="text-[13px] font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5 bg-background border border-border/40 px-3 py-1.5 rounded-md shadow-sm hover:shadow"
                >
                  <FileText className="w-4 h-4" />
                  完整报告
                </Link>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/20 border border-border/40 p-4 rounded-xl flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium">
                    <Cpu className="w-3.5 h-3.5" />
                    耗时
                  </span>
                  <span className="text-[15px] font-mono font-medium text-foreground">
                    {submissionResult.time_ms !== undefined ? `${submissionResult.time_ms} ms` : '-- ms'}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/40 p-4 rounded-xl flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium">
                    <Database className="w-3.5 h-3.5" />
                    内存
                  </span>
                  <span className="text-[15px] font-mono font-medium text-foreground">
                    {submissionResult.memory_kb !== undefined
                      ? `${(submissionResult.memory_kb / 1024).toFixed(1)} MB`
                      : '-- MB'}
                  </span>
                </div>
                <div className="bg-muted/20 border border-border/40 p-4 rounded-xl flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-medium">
                    <Code2 className="w-3.5 h-3.5" />
                    语言
                  </span>
                  <span className="text-[15px] font-mono font-medium text-foreground">
                    {submissionResult.language}
                  </span>
                </div>
              </div>

              {/* Compilation / Runtime Errors output */}
              {submissionResult.error_message && (
                <div className="space-y-2">
                  <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                    <TerminalIcon className="w-4 h-4" />
                    执行输出
                  </p>
                  <pre className="p-4 bg-red-950/20 rounded-xl border border-red-900/30 font-mono text-[13px] text-red-400 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                    {submissionResult.error_message}
                  </pre>
                </div>
              )}

              {/* Test case list details */}
              {submissionResult.test_cases && submissionResult.test_cases.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    测试用例
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {submissionResult.test_cases.map((tc, index) => (
                      <div
                        key={tc.id || index}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-mono font-medium transition-all',
                          tc.status === 'passed'
                            ? 'bg-[#10b981]/10 border-[#10b981]/20 text-[#10b981]'
                            : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'
                        )}
                      >
                        <span>#{index + 1}</span>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            tc.status === 'passed' ? 'bg-[#10b981]' : 'bg-[#ef4444]'
                          )}
                        />
                        <span>{tc.status === 'passed' ? 'AC' : 'WA'}</span>
                        {tc.time_ms !== undefined && <span className="opacity-70">({tc.time_ms}ms)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <AlertTriangle className="w-8 h-8 opacity-20 mb-3" />
              <p className="text-[13px]">评测遇到未知异常，请查看详情。</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
