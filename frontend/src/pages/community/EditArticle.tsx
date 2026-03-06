import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
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
      <div className="flex items-center justify-center min-h-[360px]">
        <Loading message="加载文章中..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Article</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex items-center gap-2 mb-2">
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
                className="flex-1 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    #{tag}
                    <span className="material-icons text-[14px]">close</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <EditorWithPreview
              value={content}
              onChange={setContent}
              placeholder="Write your article in Markdown..."
            />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Publish immediately
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}
              className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !title.trim() || !content.trim()}
                className="px-6 py-2.5 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={submitting || !title.trim() || !content.trim()}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Publishing...' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
