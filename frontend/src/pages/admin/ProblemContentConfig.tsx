import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { judgeConfigService, type UpdateProblemContentPayload } from '@/services/judgeConfig'
import { cn } from '@/lib/utils'

interface ToggleButtonProps {
  checked: boolean
  label: string
  onToggle: () => void
}

function ToggleButton({ checked, label, onToggle }: ToggleButtonProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        checked
          ? 'border-primary-container bg-primary-container/30 text-on-primary-container'
          : 'border-outline-variant bg-surface-container-low text-on-surface-variant'
      )}
    >
      <div>
        <div className="font-semibold text-on-surface">{label}</div>
        <div className="text-xs text-on-surface-variant">{checked ? '已公开' : '仅自己可见'}</div>
      </div>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider',
          checked ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
        )}
      >
        {checked ? '已开启' : '已关闭'}
      </span>
    </button>
  )
}

export function ProblemContentConfig() {
  const [problemId, setProblemId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<UpdateProblemContentPayload>({
    title: '',
    description: '',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    visibility: 'private',
    tags: [],
    is_public: false,
  })
  const [tagsText, setTagsText] = useState('')

  const loadProblem = async () => {
    if (!problemId) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await judgeConfigService.getProblem(problemId)
      setForm({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        time_limit: data.time_limit,
        memory_limit: data.memory_limit,
        visibility: data.visibility,
        tags: data.tags || [],
        is_public: data.is_public,
      })
      setTagsText((data.tags || []).join(', '))
    } catch (err: any) {
      setError(err?.response?.data?.message || '题目加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setMessage('')
  }, [problemId])

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateProblemContentPayload) => judgeConfigService.updateProblem(problemId, payload),
    onSuccess: () => {
      setMessage('保存成功')
      setError('')
    },
    onError: (err: any) => {
      setMessage('')
      setError(err?.response?.data?.message || '保存失败')
    },
  })

  const handleSave = () => {
    updateMutation.mutate({
      ...form,
      tags: tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            管理台 / 题库管理 / 题面配置
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            题面配置
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            维护真实后端支持的题面字段：标题、描述、难度、时空限制、标签与可见性。
          </p>
        </div>
        <Button onClick={handleSave} disabled={!problemId || updateMutation.isPending}>
          <span className="material-symbols-outlined text-base">{updateMutation.isPending ? 'hourglass_empty' : 'save'}</span>
          保存修改
        </Button>
      </div>

      {/* Problem ID Search */}
      <Card variant="surface" className="p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">题目 ID</label>
            <p className="text-xs text-on-surface-variant">输入题目 ID 后加载题面配置</p>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">search</span>
              <Input
                value={problemId}
                onChange={(e) => setProblemId(e.target.value.trim())}
                placeholder="输入题目 ID"
                className="pl-12"
              />
            </div>
          </div>
          <Button onClick={loadProblem} disabled={!problemId || loading}>
            加载题目
          </Button>
        </div>
        {(message || error) && (
          <div className={cn('mt-4 text-sm', message ? 'text-tertiary' : 'text-error')}>
            {message || error}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingState message="加载题目中..." />
        </div>
      ) : !problemId ? (
        <EmptyState
          title="先输入题目 ID"
          description="题面配置页需要先定位到某个题目，再读取和维护真实内容"
          icon={<span className="material-symbols-outlined text-6xl text-on-surface-variant">search</span>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          {/* Basic Info */}
          <Card variant="default" className="p-6">
            <div className="flex items-center gap-3 text-lg font-semibold text-on-surface">
              <span className="material-symbols-outlined text-2xl text-primary">description</span>
              基础信息
            </div>
            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">题目标题</label>
                <Input
                  value={form.title || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">题目描述</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={15}
                  placeholder="输入 Markdown 题面内容"
                  className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <Card variant="default" className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <span className="material-symbols-outlined text-lg text-tertiary">schema</span>
                元数据
              </div>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">难度</label>
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">标签</label>
                  <Input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="图论, 最短路"
                  />
                </div>
              </div>
            </Card>

            {/* Resource Limits */}
            <Card variant="default" className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <span className="material-symbols-outlined text-lg text-secondary">timer</span>
                资源限制
              </div>
              <div className="mt-4 grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">时间限制（ms）</label>
                  <Input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">内存限制（MB）</label>
                  <Input
                    type="number"
                    value={form.memory_limit || 256}
                    onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </Card>

            {/* Visibility */}
            <Card variant="default" className="p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                <span className="material-symbols-outlined text-lg text-tertiary">visibility</span>
                可见性
              </div>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-on-surface">可见性</label>
                  <select
                    value={form.visibility || 'private'}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        visibility: e.target.value,
                        is_public: e.target.value === 'public',
                      }))
                    }
                    className="w-full rounded-lg border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="private">仅自己可见</option>
                    <option value="public">公开</option>
                  </select>
                </div>
                <ToggleButton
                  checked={!!form.is_public}
                  label="公开题目"
                  onToggle={() =>
                    setForm((prev) => ({
                      ...prev,
                      is_public: !prev.is_public,
                      visibility: !prev.is_public ? 'public' : 'private',
                    }))
                  }
                />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProblemContentConfig
