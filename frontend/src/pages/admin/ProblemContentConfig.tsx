import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { BookText, ChevronRight, Eye, EyeOff, Loader2, Save, Search, Timer, Waypoints } from 'lucide-react'
import { judgeConfigService, type UpdateProblemContentPayload } from '@/services/judgeConfig'
import { FormSkeleton } from '@/components/skeletons/FormSkeleton'

type ProblemContentForm = UpdateProblemContentPayload & {
  show_correct_answer: boolean
}

function normalizeTags(tags: string) {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function toContentPayload(payload: ProblemContentForm): UpdateProblemContentPayload {
  return {
    title: payload.title,
    description: payload.description,
    difficulty: payload.difficulty,
    time_limit: payload.time_limit,
    memory_limit: payload.memory_limit,
    visibility: payload.visibility,
    tags: payload.tags,
    is_public: payload.is_public,
    source_url: payload.source_url,
    author_note: payload.author_note,
  }
}

export function ProblemContentConfig() {
  const [problemId, setProblemId] = useState('')
  const [loadedProblemId, setLoadedProblemId] = useState('')
  const [loadedContent, setLoadedContent] = useState<UpdateProblemContentPayload | null>(null)
  const [loadedShowCorrectAnswer, setLoadedShowCorrectAnswer] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<ProblemContentForm>({
    title: '',
    description: '',
    difficulty: 'easy',
    time_limit: 1000,
    memory_limit: 256,
    visibility: 'private',
    tags: [],
    is_public: false,
    show_correct_answer: true,
  })
  const [tagsText, setTagsText] = useState('')

  const loadProblem = async () => {
    if (!problemId) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const data = await judgeConfigService.getProblem(problemId)
      const nextForm = {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        time_limit: data.time_limit,
        memory_limit: data.memory_limit,
        visibility: data.visibility,
        tags: data.tags || [],
        is_public: data.is_public,
        show_correct_answer: data.show_correct_answer !== false,
      }
      setForm(nextForm)
      setTagsText((data.tags || []).join(', '))
      setLoadedProblemId(problemId)
      setLoadedContent(toContentPayload(nextForm))
      setLoadedShowCorrectAnswer(nextForm.show_correct_answer !== false)
    } catch (err: any) {
      setError(err?.response?.data?.message || '题目加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleProblemIdChange = (value: string) => {
    setProblemId(value.trim())
    setLoadedProblemId('')
    setLoadedContent(null)
    setLoadedShowCorrectAnswer(null)
    setMessage('')
  }

  const updateMutation = useMutation({
    mutationFn: async (payload: ProblemContentForm) => {
      const contentPayload = toContentPayload(payload)
      const contentChanged = JSON.stringify(contentPayload) !== JSON.stringify(loadedContent)
      const answerVisibility = payload.show_correct_answer !== false
      const answerVisibilityChanged =
        loadedShowCorrectAnswer === null || answerVisibility !== loadedShowCorrectAnswer

      if (contentChanged) {
        await judgeConfigService.updateProblem(problemId, contentPayload)
      }
      if (answerVisibilityChanged) {
        await judgeConfigService.updateCorrectAnswerVisibility(problemId, answerVisibility)
      }

      return payload
    },
    onSuccess: (savedPayload) => {
      setLoadedProblemId(problemId)
      setLoadedContent(toContentPayload(savedPayload))
      setLoadedShowCorrectAnswer(savedPayload.show_correct_answer !== false)
      setMessage('保存成功')
      setError('')
    },
    onError: (err: any) => {
      setMessage('')
      setError(err?.response?.data?.message || '保存失败')
    },
  })

  const handleSave = () => {
    const payload = {
      ...form,
      tags: normalizeTags(tagsText),
    }
    updateMutation.mutate(payload)
  }

  const canSave = !!loadedProblemId && loadedProblemId === problemId

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>题目</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>设置</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">题目设置</span>
        </div>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">题目设置</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              编辑题面内容、约束、可见性与提交详情的正确答案展示策略。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || updateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存修改
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative max-w-lg flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={problemId}
              onChange={(e) => handleProblemIdChange(e.target.value)}
              placeholder="输入题目 ID"
              className="w-full rounded-lg border border-border/40 bg-transparent py-2.5 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            onClick={loadProblem}
            disabled={!problemId || loading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            加载题目
          </button>
          {(message || error) && (
            <div className={`text-sm ${message ? 'text-status-accepted' : 'text-destructive'}`}>{message || error}</div>
          )}
        </div>
      </div>

      {loading ? (
        <FormSkeleton rows={3} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl shadow-sm">
              <div className="border-b border-border/40 px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BookText className="h-4 w-4 text-primary" />
                  基本信息
                </div>
              </div>
              <div className="space-y-5 p-5">
                <label className="block text-sm">
                  <span className="text-[13px] font-medium text-muted-foreground">题目标题</span>
                  <input
                    value={form.title || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-2 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[13px] font-medium text-muted-foreground">题目描述</span>
                  <textarea
                    value={form.description || ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="mt-2 min-h-[360px] w-full rounded-lg border border-border/40 bg-transparent px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="输入 Markdown 题面内容"
                  />
                </label>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Waypoints className="h-4 w-4 text-status-accepted" />
                元数据
              </div>
              <div className="mt-4 space-y-4">
                <label className="block text-sm">
                  <span className="text-[13px] text-muted-foreground">难度</span>
                  <select
                    value={form.difficulty || 'easy'}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="easy">简单</option>
                    <option value="medium">中等</option>
                    <option value="hard">困难</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[13px] text-muted-foreground">标签</span>
                  <input
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="graph, shortest-path"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Timer className="h-4 w-4 text-difficulty-medium" />
                资源限制
              </div>
              <div className="mt-4 grid gap-4">
                <label className="block text-sm">
                  <span className="text-[13px] text-muted-foreground">时间限制 (ms)</span>
                  <input
                    type="number"
                    value={form.time_limit || 1000}
                    onChange={(e) => setForm((prev) => ({ ...prev, time_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[13px] text-muted-foreground">内存限制 (MB)</span>
                  <input
                    type="number"
                    value={form.memory_limit || 256}
                    onChange={(e) => setForm((prev) => ({ ...prev, memory_limit: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Eye className="h-4 w-4 text-status-re" />
                可见性
              </div>
              <div className="mt-4 space-y-4">
                <select
                  value={form.visibility || 'private'}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  className="w-full rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="private">私有</option>
                  <option value="public">公开</option>
                </select>
                <label className="flex items-center gap-3 rounded-lg border border-border/40 bg-transparent px-4 py-2.5 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={!!form.is_public}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_public: e.target.checked }))}
                  />
                  公开题目
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                {form.show_correct_answer !== false ? (
                  <Eye className="h-4 w-4 text-status-accepted" />
                ) : (
                  <EyeOff className="h-4 w-4 text-difficulty-medium" />
                )}
                结果展示
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-lg border border-border/40 bg-transparent px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.show_correct_answer !== false}
                    onChange={(e) => setForm((prev) => ({ ...prev, show_correct_answer: e.target.checked }))}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">提交详情展示正确答案</span>
                    <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                      关闭后，学生在该题提交详情中仍可查看输入和实际输出，但不会看到期望输出。教师及以上角色仍可查看。
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
