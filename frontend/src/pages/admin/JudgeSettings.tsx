import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { judgeConfigService } from '@/services/judgeConfig'
import { cn } from '@/lib/utils'

interface ToggleButtonProps {
  checked: boolean
  disabled?: boolean
  label: string
  helper: string
  onToggle: () => void
}

function ToggleButton({ checked, disabled, label, helper, onToggle }: ToggleButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary-container bg-primary-container/30 text-on-primary-container'
          : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
      )}
    >
      <div>
        <div className="font-semibold text-on-surface">{label}</div>
        <div className="text-xs text-on-surface-variant">{helper}</div>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
          checked ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
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

  if (isLoading && problemId) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoadingState message="加载判题配置中..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 题库管理 / 判题设置
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            判题设置
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            维护真实后端支持的测试点和语言许可开关。Python 保持默认语言，C / C++ 可在这里按需启用或禁用。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={!problemId}
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            刷新
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!problemId || !newInput || !newOutput || createMutation.isPending}
          >
            <span className="material-symbols-outlined text-base">{createMutation.isPending ? 'hourglass_empty' : 'save'}</span>
            保存测试点
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="default" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">测试点</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{stats.total}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前题目的测试用例总数</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">可见</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-tertiary">{stats.visible}</p>
          <p className="mt-2 text-sm text-on-surface-variant">普通测试点，用于公开样例和基础评测</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">隐藏</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{stats.hidden}</p>
          <p className="mt-2 text-sm text-on-surface-variant">隐藏测试点用于真实判题覆盖</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">总分</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{stats.totalScore}</p>
          <p className="mt-2 text-sm text-on-surface-variant">当前测试点分值总和</p>
        </Card>
      </div>

      {/* Info Card */}
      <Card variant="surface" className="flex items-start gap-4 p-5">
        <span className="material-symbols-outlined text-2xl text-primary">storage</span>
        <div>
          <h2 className="text-base font-semibold text-on-surface">测试数据与判题设置</h2>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            真实交付范围限定为测试点维护，不扩展不存在的特殊判题和沙箱高级配置。
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Problem ID Input */}
          <Card variant="default" className="p-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">题目 ID</label>
              <p className="text-xs text-on-surface-variant">先输入题目 ID，再管理对应测试数据</p>
            </div>
            <div className="mt-4 space-y-3">
              <Input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.trim())}
                placeholder="输入题目 ID"
              />
              <Button onClick={() => refetch()} disabled={!problemId} fullWidth>
                加载
              </Button>
            </div>
          </Card>

          {/* Language Settings */}
          <Card variant="default" className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-on-surface">语言权限</h2>
                <p className="mt-1 text-sm text-on-surface-variant">Python 固定为默认，C / C++ 可开关</p>
              </div>
              <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">默认：Python</span>
            </div>
            <div className="space-y-3">
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
          </Card>

          {/* Delivery Boundary */}
          <Card variant="surface" className="flex items-start gap-4 p-5">
            <span className="material-symbols-outlined text-2xl text-on-surface-variant">settings</span>
            <div>
              <h2 className="text-base font-semibold text-on-surface">交付边界</h2>
              <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                当前页面只保留真实测试点管理，不扩展额外判题运行时开关。
              </p>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {problemId ? (
            <>
              {error ? (
                <ErrorState
                  title="测试用例加载失败"
                  message="当前题目暂时无法读取测试点数据。"
                  action={{ label: '重试', onClick: () => refetch() }}
                />
              ) : (
                <>
                  {/* New Test Case Form */}
                  <Card variant="default" className="p-6">
                    <h2 className="font-headline text-xl font-extrabold text-on-surface">添加测试点</h2>
                    <div className="mt-5 grid gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-on-surface">输入</label>
                        <textarea
                          value={newInput}
                          onChange={(e) => setNewInput(e.target.value)}
                          placeholder="输入内容"
                          rows={4}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 font-mono text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-on-surface">预期输出</label>
                        <textarea
                          value={newOutput}
                          onChange={(e) => setNewOutput(e.target.value)}
                          placeholder="预期输出"
                          rows={4}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 font-mono text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-on-surface">分值</label>
                          <Input
                            type="number"
                            value={newScore}
                            onChange={(e) => setNewScore(Number(e.target.value))}
                          />
                        </div>
                        <ToggleButton
                          checked={newHidden}
                          label="隐藏测试点"
                          helper="隐藏测试点用于真实判题覆盖"
                          onToggle={() => setNewHidden((prev) => !prev)}
                        />
                      </div>
                    </div>
                  </Card>

                  {/* Test Cases Table */}
                  <Card variant="default" className="overflow-hidden p-0">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
                      <div>
                        <h2 className="font-headline text-xl font-extrabold text-on-surface">测试点列表</h2>
                        <p className="mt-1 text-sm text-on-surface-variant">当前只交付真实测试点管理</p>
                      </div>
                      <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs font-medium text-on-surface-variant">{stats.total} 条</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-outline-variant/10">
                        <thead className="bg-surface-container-low/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">输入</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant">输出</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">分值</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-on-surface-variant">可见</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-on-surface-variant">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {cases.map((tc) => (
                            <tr key={tc.id} className="align-top transition-colors hover:bg-surface-container-low/30">
                              <td className="px-4 py-4 text-sm font-medium text-on-surface">{tc.id}</td>
                              <td className="px-4 py-4">
                                <pre className="max-w-[22rem] overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-surface-container-low p-3 font-mono text-xs text-on-surface">
                                  {tc.input}
                                </pre>
                              </td>
                              <td className="px-4 py-4">
                                <pre className="max-w-[22rem] overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-surface-container-low p-3 font-mono text-xs text-on-surface">
                                  {tc.expected_output}
                                </pre>
                              </td>
                              <td className="px-4 py-4 text-right text-sm text-on-surface">{tc.score}</td>
                              <td className="px-4 py-4 text-center text-sm text-on-surface">
                                {tc.is_hidden ? (
                                  <span className="material-symbols-outlined text-amber-600">visibility_off</span>
                                ) : (
                                  <span className="text-on-surface-variant">可见</span>
                                )}
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
                      <div className="p-12">
                        <EmptyState
                          title="暂无测试点"
                          description="当前题目还没有配置测试点"
                          icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">data_object</span>}
                        />
                      </div>
                    ) : null}
                  </Card>
                </>
              )}
            </>
          ) : (
            <EmptyState
              title="先输入题目 ID"
              description="判题设置页面需要先定位到某个题目，再读取和维护测试数据"
              icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">search</span>}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default JudgeSettings
