import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { blogApi } from '@/services/communityApi'
import type { CreateArticleRequest } from '@/types/community'

export function CreateArticle() {
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [category, setCategory] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (forcePublish?: boolean) => {
    if (!title.trim() || !content.trim()) {
      alert('请先填写文章标题和正文')
      return
    }

    setSubmitting(true)
    try {
      const data: CreateArticleRequest = {
        title,
        content,
        tags: tags.length > 0 ? tags : undefined,
        category: category || undefined,
        is_published: forcePublish !== undefined ? forcePublish : isPublished,
      }

      const article = await blogApi.createArticle(data)
      navigate(`/blog/${article.slug}`)
    } catch (error: any) {
      console.error('Failed to create article:', error)
      alert(error.response?.data?.message || '创建文章失败')
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

  const suggestedSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            社区 / 博客 / 撰写
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            撰写文章
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            把标题、正文、分类和标签收进同一张编辑画布，保持写作流程简洁直接。
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/blog')}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          返回博客
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标题长度</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-on-surface">{title.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">上限 500 个字符</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">标签数</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-primary">{tags.length}</p>
          <p className="mt-2 text-sm text-on-surface-variant">用于归档和检索</p>
        </Card>
        <Card variant="surface" className="p-5">
          <p className="text-sm font-medium text-on-surface-variant">发布状态</p>
          <p className="mt-4 font-headline text-3xl font-extrabold text-secondary">{isPublished ? '已发布' : '草稿'}</p>
          <p className="mt-2 text-sm text-on-surface-variant">提交时仍沿用原有发布字段</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <Card variant="default" className="p-6">
          <h2 className="font-headline text-xl font-extrabold text-on-surface">编辑工作台</h2>
          <p className="mt-1 text-sm text-on-surface-variant">把标题、正文、分类和标签放在同一工作台内，减少来回切换。</p>
          <div className="mt-5 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">文章标题</label>
              <p className="text-xs text-on-surface-variant">
                {suggestedSlug ? `/blog/${suggestedSlug}` : 'slug 将按标题自动推导'}
              </p>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="先写清文章的核心结论"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-on-surface">文章正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="用 Markdown 写正文，首段尽量先把结论说清楚。"
              />
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <h2 className="font-headline text-lg font-extrabold text-on-surface">发布信息</h2>
            <p className="mt-1 text-sm text-on-surface-variant">这些字段直接映射到现有创建文章接口，不改 payload 形状。</p>
            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">分类</label>
                <p className="text-xs text-on-surface-variant">可留空，后端仍按原逻辑处理 undefined。</p>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="题解、教程、公告"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-on-surface">添加标签</label>
                <p className="text-xs text-on-surface-variant">回车或点击按钮添加，重复标签会被忽略。</p>
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
                    placeholder="网络流"
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
                  <p className="mt-1 text-sm text-on-surface-variant">关闭时默认作为草稿保留，仍由 `is_published` 控制。</p>
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
              <span className="material-symbols-outlined text-lg text-tertiary">description</span>
              写作提示
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-on-surface-variant">
              <li>先写结论，再补推导过程或背景。</li>
              <li>代码块保留语言名，便于阅读器高亮。</li>
              <li>这次只做视觉收口，不增加协同编辑、版本树和资源库。</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 border-t border-outline-variant/10 pt-4">
        <Button variant="ghost" onClick={() => navigate('/blog')}>
          取消
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <span className="material-symbols-outlined text-base">edit</span>
          {submitting ? '正在保存...' : '保存草稿'}
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
