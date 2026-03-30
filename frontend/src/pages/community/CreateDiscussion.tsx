import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { discussionsApi } from '@/services/communityApi'
import type { CreateDiscussionRequest } from '@/types/community'

export function CreateDiscussion() {
  const navigate = useNavigate()
  const { problemId } = useParams()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('请先填写讨论标题和正文')
      return
    }

    setSubmitting(true)
    try {
      const data: CreateDiscussionRequest = {
        title,
        content,
        problem_id: problemId ? parseInt(problemId) : undefined,
        tags: tags.length > 0 ? tags : undefined,
      }

      const discussion = await discussionsApi.createDiscussion(data)
      navigate(`/discussions/${discussion.id}`)
    } catch (error: any) {
      console.error('Failed to create discussion:', error)
      alert(error.response?.data?.message || '发布讨论失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags((prev) => [...prev, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            社区 / {problemId ? `题目 / ${problemId} / 讨论` : '讨论 / 新建'}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            发起讨论
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {problemId
              ? '围绕当前题目发起讨论或提问，提交时仍使用原有 `problem_id` 语义。'
              : '发起一个新的社区讨论，页面只保留标题、标签和正文三块核心输入。'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/discussions')}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          返回讨论列表
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标题长度</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{title.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">建议标题先给出问题核心</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标签数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{tags.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">会继续按数组发给后端</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">关联题目</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{problemId || '无'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">有题号时才会带上 `problem_id`</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <Card variant="default" className="p-6">
          <h2 className="font-headline text-xl font-extrabold text-on-surface">讨论工作台</h2>
          <p className="mt-1 text-sm text-on-surface-variant">让提问和展开背景都在同一工作区完成，减少额外装饰。</p>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">讨论标题</label>
              <p className="text-xs text-on-surface-variant">标题越具体，后续回复质量通常越高。</p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="你具体卡在什么地方？"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">讨论正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="说明背景、你已经尝试过的思路，以及具体卡住的点。"
              />
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">标签面板</h2>
            <p className="mt-1 text-sm text-on-surface-variant">标签是可选的；不填时仍保持原来的 undefined 行为。</p>
            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">添加标签</label>
                <p className="text-xs text-on-surface-variant">回车或点击按钮添加标签。</p>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="动态规划"
                  />
                  <Button variant="outline" onClick={handleAddTag} className="shrink-0">
                    <span className="material-symbols-outlined text-base">add</span>
                    添加
                  </Button>
                </div>
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-high px-3 py-1.5 text-sm text-on-surface transition hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-base">label</span>
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card variant="surface" className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <span className="material-symbols-outlined text-lg text-tertiary">lightbulb</span>
              提问提示
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
              <li>交代输入、预期输出和你已经尝试过的思路。</li>
              <li>如果是代码问题，正文里直接贴最小可复现片段。</li>
              <li>页面不新增草稿箱、提问模板库或私有讨论流。</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 pt-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          取消
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}>
          <span className="material-symbols-outlined text-base">{submitting ? 'hourglass_empty' : 'send'}</span>
          {submitting ? '发布中...' : '发布讨论'}
        </Button>
      </div>
    </div>
  )
}
