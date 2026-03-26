import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, EyeOff, Loader2, RefreshCw, Save, Settings2 } from 'lucide-react'
import { judgeConfigService } from '@/services/judgeConfig'
import { EmptyState } from '@/components/page/EmptyState'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

const textareaClassName =
  'min-h-[120px] w-full rounded-[18px] border border-[rgba(193,201,224,0.36)] bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)] px-[18px] py-3 font-mono text-sm text-[#17305e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_12px_28px_rgba(19,27,46,0.05)] outline-none transition-all duration-200 placeholder:text-[#93a0bb] focus-visible:border-[rgba(12,86,208,0.28)] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.09)]'

function ToggleButton({
  checked,
  disabled,
  label,
  helper,
  onToggle,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  helper: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(12,86,208,0.12)] disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-[#b2c5ff] bg-white text-[#17305e] shadow-[0_12px_24px_rgba(0,61,155,0.08)]'
          : 'border-slate-200 bg-slate-50 text-slate-700'
      )}
    >
      <div>
        <div className="font-semibold text-slate-950">{label}</div>
        <div className="text-xs text-slate-500">{helper}</div>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
          checked ? 'bg-[#dae2ff] text-[#003d9b]' : 'bg-slate-100 text-slate-500'
        )}
      >
        {checked ? '已启用' : '已停用'}
      </span>
    </button>
  )
}

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

  const cEnabled = languageSettings.find((language) => language.id === 'c')?.enabled ?? false
  const cppEnabled = languageSettings.find((language) => language.id === 'cpp')?.enabled ?? false

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

  const cases = useMemo(() => data ?? [], [data])
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

  const saveLanguageSettings = (next: { c_enabled?: boolean; cpp_enabled?: boolean }) => {
    updateLanguageMutation.mutate({
      c_enabled: next.c_enabled ?? cEnabled,
      cpp_enabled: next.cpp_enabled ?? cppEnabled,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loading message="加载判题配置中..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="管理台"
        breadcrumb={['题库管理', '判题设置']}
        title="判题设置"
        description="只维护真实后端支持的测试点和语言许可开关。Python 保持默认语言，C / C++ 可在这里按需启用或禁用。"
        actions={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={!problemId}
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </Button>
            <Button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={!problemId || !newInput || !newOutput || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存测试点
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="测试点" value={stats.total} helper="当前题目的测试用例总数" />
        <StatCard label="可见" value={stats.visible} helper="普通测试点，可用于公开样例和基础评测" />
        <StatCard label="隐藏" value={stats.hidden} helper="隐藏测试点用于真实判题覆盖" />
        <StatCard label="总分" value={stats.totalScore} helper="当前测试点分值总和" />
      </section>

      <SurfaceCard className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <Database className="mt-1 h-5 w-5 text-blue-700" />
          <div>
            <h2 className="text-base font-semibold text-slate-950">测试数据与判题设置</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              真实交付范围限定为测试点维护，不扩展不存在的特殊判题和沙箱高级配置。
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="space-y-4">
              <FieldGroup label="题目 ID" description="先输入题目 ID，再管理对应测试数据。">
                <Input
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value.trim())}
                  placeholder="输入题目 ID"
                />
              </FieldGroup>
              <Button type="button" onClick={() => refetch()} disabled={!problemId} fullWidth>
                加载
              </Button>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">语言权限</h2>
                <p className="mt-1 text-sm text-slate-600">Python 固定为默认语言，C / C++ 可在这里开启或关闭。</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">默认：Python</span>
            </div>
            <div className="mt-4 space-y-3">
              {languageSettings.map((language) => (
                <ToggleButton
                  key={language.id}
                  checked={language.enabled}
                  label={language.name}
                  helper={language.is_default ? '默认语言' : '可选语言'}
                  disabled={language.id === 'python' || updateLanguageMutation.isPending}
                  onToggle={() => {
                    if (language.id === 'c') {
                      saveLanguageSettings({ c_enabled: !language.enabled })
                    }
                    if (language.id === 'cpp') {
                      saveLanguageSettings({ cpp_enabled: !language.enabled })
                    }
                  }}
                />
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className="border-slate-200 bg-slate-50">
            <div className="flex items-start gap-3">
              <Settings2 className="mt-1 h-5 w-5 text-slate-700" />
              <div>
                <h2 className="text-base font-semibold text-slate-950">交付边界</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  当前页面只保留真实测试点管理，不扩展额外判题运行时开关。
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          {problemId ? (
            <>
              {error ? (
                <EmptyState
                  title="测试用例加载失败"
                  description="当前题目暂时无法读取测试点数据。"
                  action={<Button onClick={() => refetch()}>重试</Button>}
                />
              ) : (
                <>
                  <SurfaceCard>
                    <div className="grid gap-4">
                      <FieldGroup label="输入">
                        <textarea
                          value={newInput}
                          onChange={(e) => setNewInput(e.target.value)}
                          placeholder="输入内容"
                          className={textareaClassName}
                        />
                      </FieldGroup>
                      <FieldGroup label="预期输出">
                        <textarea
                          value={newOutput}
                          onChange={(e) => setNewOutput(e.target.value)}
                          placeholder="预期输出"
                          className={textareaClassName}
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label="分值">
                          <Input
                            type="number"
                            value={newScore}
                            onChange={(e) => setNewScore(Number(e.target.value))}
                          />
                        </FieldGroup>
                        <ToggleButton
                          checked={newHidden}
                          label="隐藏测试点"
                          helper="隐藏测试点用于真实判题覆盖"
                          onToggle={() => setNewHidden((prev) => !prev)}
                        />
                      </div>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-950">测试点列表</h2>
                        <p className="mt-1 text-sm text-slate-600">当前只交付真实测试点管理，不扩展额外判题运行时开关。</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{stats.total} 条</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">输入</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">输出</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">分值</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">可见</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {cases.map((tc) => (
                            <tr key={tc.id} className="align-top transition hover:bg-slate-50">
                              <td className="px-4 py-4 text-sm font-medium text-slate-700">{tc.id}</td>
                              <td className="px-4 py-4">
                                <pre className="max-w-[22rem] overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                                  {tc.input}
                                </pre>
                              </td>
                              <td className="px-4 py-4">
                                <pre className="max-w-[22rem] overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-700">
                                  {tc.expected_output}
                                </pre>
                              </td>
                              <td className="px-4 py-4 text-right text-sm text-slate-700">{tc.score}</td>
                              <td className="px-4 py-4 text-center text-sm text-slate-700">
                                {tc.is_hidden ? <EyeOff className="mx-auto h-4 w-4 text-amber-600" /> : '可见'}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(tc.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  删除
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {cases.length === 0 ? (
                      <EmptyState
                        className="border-0 bg-transparent shadow-none"
                        title="暂无测试点"
                        description="当前题目还没有配置测试点。"
                      />
                    ) : null}
                  </SurfaceCard>
                </>
              )}
            </>
          ) : (
            <EmptyState
              title="先输入题目 ID"
              description="判题设置页面需要先定位到某个题目，再读取和维护测试数据。"
            />
          )}
        </div>
      </div>
    </div>
  )
}
