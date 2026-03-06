import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">判题设置</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">按题目维护测试用例（输入 / 输出 / 分值 / 隐藏）</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <label className="text-sm text-slate-600 dark:text-slate-300">题目 ID</label>
        <div className="mt-2 flex gap-2">
          <input
            value={problemId}
            onChange={(e) => setProblemId(e.target.value.trim())}
            placeholder="输入题目 ID"
            className="w-full md:w-80 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="button"
            onClick={() => refetch()}
            disabled={!problemId}
            className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
          >
            加载
          </button>
        </div>
      </div>

      {problemId && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">新增测试用例</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <textarea
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="输入"
              className="min-h-[120px] px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              value={newOutput}
              onChange={(e) => setNewOutput(e.target.value)}
              placeholder="期望输出"
              className="min-h-[120px] px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              分值
              <input
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(Number(e.target.value))}
                className="ml-2 w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </label>
            <label className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <input
                type="checkbox"
                checked={newHidden}
                onChange={(e) => setNewHidden(e.target.checked)}
              />
              隐藏测试
            </label>
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!newInput || !newOutput || createMutation.isPending}
              className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
            >
              {createMutation.isPending ? '保存中...' : '添加用例'}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center">
          <Loading message="加载测试用例中..." />
        </div>
      ) : error ? (
        <div className="rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          测试用例加载失败
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">输入</th>
                <th className="px-3 py-2 text-left">输出</th>
                <th className="px-3 py-2 text-right">分值</th>
                <th className="px-3 py-2 text-center">隐藏</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((tc) => (
                <tr key={tc.id} className="border-t border-slate-200 dark:border-slate-800 align-top">
                  <td className="px-3 py-2 text-slate-500">{tc.order}</td>
                  <td className="px-3 py-2 whitespace-pre-wrap">{tc.input || '-'}</td>
                  <td className="px-3 py-2 whitespace-pre-wrap">{tc.expected_output || '-'}</td>
                  <td className="px-3 py-2 text-right">{tc.score}</td>
                  <td className="px-3 py-2 text-center">{tc.is_hidden ? '是' : '否'}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(tc.id)}
                      disabled={deleteMutation.isPending}
                      className="px-2 py-1 text-red-600 hover:underline disabled:opacity-50"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {problemId && (data || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    暂无测试用例
                  </td>
                </tr>
              )}
              {!problemId && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                    输入题目 ID 后查看
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
