import { useState } from 'react'
import { Cpu } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface TestCase {
  id: number
  input?: string
  expected_output?: string
  actual_output?: string
  status: 'passed' | 'failed' | 'pending' | 'running'
  error?: string
  is_hidden?: boolean
  time_ms?: number
}

function isActualOutputAccepted(testCase: TestCase) {
  if (testCase.status !== 'passed') return false
  if (testCase.actual_output === undefined) return true
  const expected = testCase.expected_output?.trim()
  return expected === undefined || testCase.actual_output.trim() === expected
}

interface TestCaseMatrixProps {
  testCases: TestCase[]
  showCorrectAnswer: boolean
}

export function TestCaseMatrix({ testCases, showCorrectAnswer }: TestCaseMatrixProps) {
  const [expandedTestCases, setExpandedTestCases] = useState<Set<number>>(new Set([0]))

  const toggleTestCase = (id: number) => {
    setExpandedTestCases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="surface-card overflow-hidden backdrop-blur-xl/60">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">测试用例执行矩阵</h3>
        </div>
        <span className="text-[13px] font-mono text-muted-foreground uppercase tracking-wider">Matrix view</span>
      </div>
      <div className="divide-y divide-border/40">
        {testCases.map((testCase, index) => {
          const isExpanded = expandedTestCases.has(index)
          const isPassed = testCase.status === 'passed'
          const actualOutputAccepted = isActualOutputAccepted(testCase)

          return (
            <div
              key={testCase.id}
              className={cn(
                'transition-all duration-200 border-l-2',
                isPassed ? 'border-l-status-accepted bg-status-accepted/[0.01]' : 'border-l-destructive bg-destructive/[0.01]',
                isExpanded ? 'bg-muted/10' : 'hover:bg-muted/5'
              )}
            >
              {/* Test Case Header */}
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer select-none"
                onClick={() => toggleTestCase(index)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-lg border text-[13px] font-bold font-mono',
                    isPassed ? 'bg-status-accepted/10 border-status-accepted/20 text-status-accepted' : 'bg-destructive/10 border-destructive/20 text-destructive'
                  )}>
                    {testCase.id}
                  </div>
                  <span className="text-sm font-semibold text-foreground">测试用例 #{testCase.id}</span>
                  {testCase.time_ms !== undefined && (
                    <span className="font-mono text-[13px] tabular-nums text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">
                      {testCase.time_ms} ms
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'rounded-full px-2.5 py-0.5 text-[13px] font-bold tracking-wider uppercase',
                    isPassed
                      ? 'bg-status-accepted/10 text-status-accepted border border-status-accepted/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  )}>
                    {isPassed ? 'Passed' : 'Failed'}
                  </span>
                </div>
              </div>

              {/* Test Case Details */}
              {isExpanded && (
                <div className="px-5 pb-4 pt-1 space-y-4 border-t border-border/20 animate-slide-down">
                  {!isPassed && testCase.error && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-[13px] text-destructive font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                      <div className="text-[13px] font-black uppercase tracking-wider text-destructive/80 mb-1">Error Logs:</div>
                      {testCase.error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">输入数据</p>
                      <pre className="text-[13px] bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl font-mono overflow-x-auto text-zinc-100 shadow-inner max-h-48 leading-relaxed">
                        {testCase.input ?? (testCase.is_hidden ? '隐藏用例不展示输入数据' : '无输入数据')}
                      </pre>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">期望输出</p>
                      <pre className="text-[13px] bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl font-mono overflow-x-auto text-zinc-100 shadow-inner max-h-48 leading-relaxed">
                        {testCase.expected_output ?? (
                          testCase.is_hidden
                            ? '隐藏用例不展示期望输出'
                            : showCorrectAnswer
                              ? '无期望输出数据'
                              : '该题当前不展示正确答案'
                        )}
                      </pre>
                    </div>
                  </div>

                  {testCase.actual_output !== undefined && (
                    <div className="space-y-1.5">
                      <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">实际输出</p>
                      <pre className={cn(
                        'text-[13px] p-3.5 rounded-xl font-mono overflow-x-auto border shadow-inner max-h-48 leading-relaxed',
                        actualOutputAccepted
                          ? 'bg-status-accepted/5 border-status-accepted/20 text-status-accepted'
                          : 'bg-destructive/5 border-destructive/20 text-destructive'
                      )}>
                        {testCase.actual_output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
