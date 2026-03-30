import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/hooks/useAuth'
import { blogApi } from '@/services/communityApi'
import type { UpdateArticleRequest } from '@/types/community'

export function EditArticle() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [category, setCategory] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return

    const fetchArticle = async () => {
      setLoading(true)
      try {
        const detail = await blogApi.getArticle(slug)

        if (user && detail.author.id && detail.author.id !== user.id) {
          navigate(`/blog/${slug}`)
          return
        }

        setTitle(detail.article.title)
        setContent(detail.article.content)
        setTags(detail.article.tags || [])
        setCategory(detail.article.category || '')
        setIsPublished(detail.article.is_published)
      } catch (error) {
        console.error('Failed to load article for edit:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug, user?.id, navigate])

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

  const handleSubmit = async (forcePublish?: boolean) => {
    if (!slug || !title.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      const payload: UpdateArticleRequest = {
        title: title.trim(),
        content,
        tags,
        category: category || undefined,
        is_published: forcePublish !== undefined ? forcePublish : isPublished,
      }

      const updated = await blogApi.updateArticle(slug, payload)
      navigate(`/blog/${updated.slug}`)
    } catch (error) {
      console.error('Failed to update article:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingState message="正在加载文章..." />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            社区 / 博客 / {slug || '文章'} / 编辑
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            编辑文章
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            围绕同一篇文章继续修改标题、正文和发布状态，只调用现有文章详情与更新接口。
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          返回文章
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">当前状态</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{isPublished ? '已发布' : '草稿'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">保存草稿时会覆盖回 `is_published: false`。</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标签数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{tags.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">沿用原数组字段提交</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标题长度</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{title.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">更新时会保持标题 trim 逻辑</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <Card variant="default" className="p-6">
          <h2 className="font-headline text-xl font-extrabold text-on-surface">编辑工作台</h2>
          <p className="mt-1 text-sm text-on-surface-variant">把编辑主任务压缩成标题与正文两块，减少边缘说明和视觉噪音。</p>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">文章标题</label>
              <p className="text-xs text-on-surface-variant">仍以当前 slug 对应文章为更新目标。</p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">文章正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="用 Markdown 继续修改正文。"
              />
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">发布信息</h2>
            <p className="mt-1 text-sm text-on-surface-variant">这些值仍按原样映射到更新 payload。</p>
            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">分类</label>
                <p className="text-xs text-on-surface-variant">可留空，仍会回落成 undefined。</p>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">添加标签</label>
                <p className="text-xs text-on-surface-variant">重复标签不会加入，点击已有标签可移除。</p>
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
                    placeholder="题解"
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

              <label className="flex items-start justify-between gap-4 rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">立即发布</p>
                  <p className="mt-1 text-sm text-on-surface-variant">关闭后会按现有行为保存为草稿。</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.checked)}
                  className="mt-1 h-4 w-4 rounded border-outline-variant"
                />
              </label>
            </div>
          </Card>

          <Card variant="surface" className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface">
              <span className="material-symbols-outlined text-lg text-tertiary">info</span>
              修改说明
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
              <li>保留原有鉴权判断和 slug 跳转。</li>
              <li>不增加版本历史、评论预审或多作者协同。</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 pt-4">
        <Button variant="ghost" onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}>
          取消
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <span className="material-symbols-outlined text-base">{submitting ? 'hourglass_empty' : 'save'}</span>
          {submitting ? '正在保存...' : '保存文章'}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <span className="material-symbols-outlined text-base">{submitting ? 'hourglass_empty' : 'send'}</span>
          {submitting ? '发布中...' : '发布文章'}
        </Button>
      </div>
    </div>
  )
}
