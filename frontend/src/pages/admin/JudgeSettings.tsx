import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Database, EyeOff, FileArchive, Loader2, RefreshCw, Save, Settings2, Trash2 } from 'lucide-react'
import { judgeConfigService } from '@/services/judgeConfig'
import { Loading } from '@/components/ui/Loading'

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
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Admin</span>
                <ChevronRight className="h-4 w-4" />
                <span>Problems</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900">Judge Settings</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Test Data & Judge Settings</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  按 reference 的测试数据页重做，真实交付范围限定为测试用例维护，不扩展不存在的 special judge 和沙箱高级配置。
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={!problemId}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={!problemId || !newInput || !newOutput || createMutation.isPending}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Case
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Test Cases</span>
            <Database className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{stats.total}</div>
          <p className="mt-2 text-sm text-slate-600">当前题目的测试用例总数。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Visible</span>
            <Settings2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-emerald-600">{stats.visible}</div>
          <p className="mt-2 text-sm text-slate-600">普通测试点，可用于公开样例和基础评测。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Hidden</span>
            <EyeOff className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-amber-600">{stats.hidden}</div>
          <p className="mt-2 text-sm text-slate-600">隐藏测试点用于真实判题覆盖。</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Total Score</span>
            <FileArchive className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-4 text-3xl font-semibold text-slate-950">{stats.totalScore}</div>
          <p className="mt-2 text-sm text-slate-600">当前测试点分值总和。</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">Problem Selector</div>
            <p className="mt-1 text-sm leading-6 text-slate-600">先输入题目 ID，再管理对应测试数据。</p>
            <div className="mt-4 flex gap-3">
              <input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.trim())}
                placeholder="输入题目 ID"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => refetch()}
                disabled={!problemId}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                加载
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-950">Add Test Case</div>
            <div className="mt-4 space-y-4">
              <textarea
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Input"
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <textarea
                value={newOutput}
                onChange={(e) => setNewOutput(e.target.value)}
                placeholder="Expected output"
                className="min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
              <div className="grid grid-cols-2 gap-4">
                <label className="text-sm">
                  <span className="text-slate-600">Score</span>
                  <input
                    type="number"
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
                <label className="flex items-end gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" checked={newHidden} onChange={(e) => setNewHidden(e.target.checked)} />
                  Hidden case
                </label>
              </div>
            </div>
          </div>
        </aside>

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loading message="加载测试用例中..." />
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center text-sm text-rose-600">测试用例加载失败</div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-semibold text-slate-950">Case Table</h2>
                <p className="mt-1 text-sm text-slate-600">当前只交付真实 test case 管理，不扩展额外 judge runtime 开关。</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">#</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Input</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Output</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Score</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hidden</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cases.map((tc) => (
                      <tr key={tc.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-500">{tc.order}</td>
                        <td className="px-6 py-4 whitespace-pre-wrap font-mono text-sm text-slate-800">{tc.input || '-'}</td>
                        <td className="px-6 py-4 whitespace-pre-wrap font-mono text-sm text-slate-800">{tc.expected_output || '-'}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{tc.score}</td>
                        <td className="px-6 py-4 text-center text-sm">{tc.is_hidden ? 'Yes' : 'No'}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(tc.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {problemId && cases.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-500">
                          当前题目暂无测试用例
                        </td>
                      </tr>
                    )}
                    {!problemId && (
                      <tr>
                        <td colSpan={6} className="px-6 py-14 text-center text-sm text-slate-500">
                          先输入题目 ID 再查看测试数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </section>
    </div>
  )
}
