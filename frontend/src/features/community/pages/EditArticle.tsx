import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save, Send, Tags, X } from 'lucide-react'
import { blogApi } from '@/features/community/services/articlesApi'
import type { UpdateArticleRequest } from '@/features/community/types/community'
import { EditorWithPreview } from '@/features/community/components/EditorWithPreview'
import { FormSkeleton } from '@/shared/components/FormSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { useAuth } from '@/features/auth/hooks/useAuth'

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
  const [loadError, setLoadError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!slug) return

    const fetchArticle = async () => {
      setLoading(true)
      setLoadError(false)
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
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug, user, navigate])

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
        <FormSkeleton rows={4} />
      </div>
    )
  }

  if (loadError) {
    return <InlineError title="文章加载失败" onRetry={() => { if (slug) { const fetchArticle = async () => { setLoading(true); setLoadError(false); try { const detail = await blogApi.getArticle(slug); setTitle(detail.article.title); setContent(detail.article.content); setTags(detail.article.tags || []); setCategory(detail.article.category || ''); setIsPublished(detail.article.is_published); } catch { setLoadError(true); } finally { setLoading(false); } }; fetchArticle(); } }} />
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" />
                返回文章
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">编辑文章</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  在同一篇文章上继续迭代标题、标签和正文。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">状态</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{isPublished ? '已发布' : '草稿'}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">标签</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{tags.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">标题</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{title.length}/500</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Layout */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                maxLength={500}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="使用 Markdown 撰写你的文章..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">元信息</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">分类</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标签</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddTag()
                      }
                    }}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                  >
                    添加
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20 transition"
                      >
                        #{tag}
                        <X className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center justify-between rounded-xl bg-background border border-border px-4 py-4 cursor-pointer">
                <div>
                  <p className="font-medium text-foreground text-sm">立即发布</p>
                  <p className="text-xs text-muted-foreground mt-0.5">关闭后保存为草稿状态</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-background transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50 transition"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? '保存中...' : '保存草稿'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              {submitting ? '发布中...' : '保存并发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
