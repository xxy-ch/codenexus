import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save, Send, Tags } from 'lucide-react'
import { blogApi } from '@/services/articlesApi'
import type { UpdateArticleRequest } from '@/types/community'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { Loading } from '@/components/ui/Loading'
import { useAuth } from '@/hooks/useAuth'

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
        <Loading message="加载文章中..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(135deg,#eff6ff_0%,#ecfeff_42%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back To Article
              </button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Edit Article</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  在同一篇文章上继续迭代标题、标签和正文。当前交付仍基于真实博客更新接口，不额外引入草稿版本系统。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{isPublished ? 'Published' : 'Draft'}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tags</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{tags.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Title</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{title.length}/500</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-lg"
                maxLength={500}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="Write your article in Markdown..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <Tags className="h-4 w-4" />
              <h2 className="text-lg font-semibold">Metadata</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">分类</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">标签</label>
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
                    className="flex-1 rounded-xl border px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
                  >
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-900">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">立即发布</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">关闭后保存为草稿状态</p>
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

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm font-medium text-slate-900 dark:text-white">交付边界</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              当前编辑页支持标题、分类、标签和正文更新。不包含修订历史、多人协同和富媒体资源管理。
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Publishing...' : 'Save & Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
