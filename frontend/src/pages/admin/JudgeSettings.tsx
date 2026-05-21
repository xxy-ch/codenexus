import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Database, EyeOff, FileArchive, Loader2, RefreshCw, Save, Settings2, Trash2 } from 'lucide-react'
import { judgeConfigService } from '@/services/judgeConfig'
import { FormSkeleton } from '@/components/skeletons/FormSkeleton'
import { InlineError } from '@/components/ui/InlineError'

export function JudgeSettings() {
  const queryClient = useQueryClient()
  const [problemId, setProblemId] = useState('')
  const [newInput, setNewInput] = useState('')
  const [newOutput, setNewOutput] = useState('')
  const [newScore, setNewScore] = useState(10)
  const [newHidden, setNewHidden] = useState(false)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['judge-test-cases', problemId],
    queryFn: () => judgeConfigService.getTestCases(problemId),
    enabled: !!problemId,
  })

  const { data: languageSettings = [] } = useQuery({
    queryKey: ['judge-language-settings'],
    queryFn: () => judgeConfigService.getLanguageSettings(),
  })

  const updateLanguageMutation = useMutation({
    mutationFn: (payload: { c_enabled: boolean; cpp_enabled: boolean }) =>
      judgeConfigService.updateLanguageSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-language-settings'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      judgeConfigService.createTestCase(problemId, {
        input: newInput,
        expected_output: newOutput,
        score: newScore,
        is_hidden: newHidden,
      }),
    onSuccess: () => {
      setNewInput('')
      setNewOutput('')
      setNewScore(10)
      setNewHidden(false)
      queryClient.invalidateQueries({ queryKey: ['judge-test-cases', problemId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (testCaseId: number) => judgeConfigService.deleteTestCase(problemId, testCaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judge-test-cases', problemId] })
    },
  })

  const cases = useMemo(() => data || [], [data])
  const stats = useMemo(() => {
    const hidden = cases.filter((tc) => tc.is_hidden).length
    const totalScore = cases.reduce((sum, tc) => sum + Number(tc.score || 0), 0)
    return {
      total: cases.length,
      hidden,
      visible: cases.length - hidden,
      totalScore,
    }
  }, [cases])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>Problems</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">判题设置</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">测试数据与判题设置</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              管理测试用例、时间空间限制与评测参数。当前交付范围限定为测试用例维护。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={!problemId}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!problemId || !newInput || !newOutput || createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存用例
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">测试用例</span>
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-2xl font-bold text-foreground">{stats.total}</div>
          <p className="mt-2 text-[13px] text-muted-foreground">当前题目的测试用例总数。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">可见</span>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-status-accepted" />
            <span className="text-2xl font-bold text-status-accepted">{stats.visible}</span>
          </div>
          <p className="mt-2 text-[13px] text-muted-foreground">普通测试点。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">隐藏</span>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-2xl font-bold text-difficulty-medium">{stats.hidden}</div>
          <p className="mt-2 text-[13px] text-muted-foreground">隐藏测试点用于真实判题覆盖。</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">总分值</span>
            <FileArchive className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-4 text-2xl font-bold text-foreground">{stats.totalScore}</div>
          <p className="mt-2 text-[13px] text-muted-foreground">当前测试点分值总和。</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6">
          {/* Problem Selector */}
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">题目选择</div>
            <p className="mt-1 text-sm text-muted-foreground">先输入题目 ID，再管理对应测试数据。</p>
            <div className="mt-4 flex gap-3">
              <input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.trim())}
                placeholder="输入题目 ID"
                className="w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={() => refetch()}
                disabled={!problemId}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                加载
              </button>
            </div>
          </div>

          {/* Language Permissions */}
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">语言权限</div>
            <p className="mt-1 text-sm text-muted-foreground">Python 为默认语言，C/C++ 可在此开启或关闭。</p>
            <div className="mt-4 space-y-3">
              {languageSettings.map((language) => (
                <label key={language.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-transparent px-4 py-3 text-sm text-foreground">
                  <div>
                    <div className="text-sm font-medium text-foreground">{language.name}</div>
                    <div className="text-[13px] text-muted-foreground">{language.is_default ? '默认语言' : '可选语言'}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={language.enabled}
                    disabled={language.id === 'python' || updateLanguageMutation.isPending}
                    onChange={(e) =>
                      updateLanguageMutation.mutate({
                        c_enabled: language.id === 'c' ? e.target.checked : !!languageSettings.find((item) => item.id === 'c')?.enabled,
                        cpp_enabled: language.id === 'cpp' ? e.target.checked : !!languageSettings.find((item) => item.id === 'cpp')?.enabled,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Add Test Case */}
          <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
            <div className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">添加测试用例</div>
            <div className="mt-4 space-y-4">
              <textarea
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="输入数据"
                className="min-h-[120px] w-full rounded-lg border border-border/40 bg-transparent px-4 py-3 font-mono text-[13px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <textarea
                value={newOutput}
                onChange={(e) => setNewOutput(e.target.value)}
                placeholder="期望输出"
                className="min-h-[120px] w-full rounded-lg border border-border/40 bg-transparent px-4 py-3 font-mono text-[13px] text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="text-[13px] text-muted-foreground">分值</span>
                  <input
                    type="number"
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex items-end gap-3 rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground">
                  <input type="checkbox" checked={newHidden} onChange={(e) => setNewHidden(e.target.checked)} />
                  隐藏用例
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Case Table */}
        <div className="overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
          {isLoading ? (
            <FormSkeleton rows={4} />
          ) : error ? (
            <InlineError title="配置加载失败" onRetry={() => refetch()} />
          ) : (
            <>
              <div className="border-b border-border/40 px-5 py-4">
                <h2 className="text-sm font-semibold text-foreground">用例列表</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">当前只交付真实 test case 管理。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border/40">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">#</th>
                      <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">输入</th>
                      <th className="px-5 py-3 text-left text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">输出</th>
                      <th className="px-5 py-3 text-right text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">分值</th>
                      <th className="px-5 py-3 text-center text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">隐藏</th>
                      <th className="px-5 py-3 text-right text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-transparent">
                    {cases.map((tc) => (
                      <tr key={tc.id} className="transition hover:bg-muted/50">
                        <td className="px-5 py-4 text-[13px] text-muted-foreground">{tc.order}</td>
                        <td className="px-5 py-4 whitespace-pre-wrap font-mono text-[13px] text-foreground">{tc.input || '-'}</td>
                        <td className="px-5 py-4 whitespace-pre-wrap font-mono text-[13px] text-foreground">{tc.expected_output || '-'}</td>
                        <td className="px-5 py-4 text-right text-sm font-medium text-foreground">{tc.score}</td>
                        <td className="px-5 py-4 text-center text-[13px]">
                          {tc.is_hidden
                            ? <span className="rounded-full bg-difficulty-medium/10 px-2 py-0.5 text-difficulty-medium">是</span>
                            : <span className="text-muted-foreground">否</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(tc.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-[13px] font-medium text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {problemId && cases.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                          当前题目暂无测试用例
                        </td>
                      </tr>
                    )}
                    {!problemId && (
                      <tr>
                        <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">
                          先输入题目 ID 再查看测试数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
