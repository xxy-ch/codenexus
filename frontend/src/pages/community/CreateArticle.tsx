import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PencilLine, Save, Send, Tags } from 'lucide-react'
import { blogApi } from '@/services/communityApi'
import type { CreateArticleRequest } from '@/types/community'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'

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
      alert('Please fill in title and content')
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
      alert(error.response?.data?.message || 'Failed to create article')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const generateSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '')

  const suggestedSlug = generateSlug(title)

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.18),_transparent_30%),linear-gradient(135deg,#fff7ed_0%,#fdf2f8_45%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(244,114,182,0.22),_transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <button
                onClick={() => navigate('/blog')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back To Feed
              </button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Write Article</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  使用动态编辑器、预览面板和真实博客接口撰写文章。当前交付保留题解、教程和公告类正文编辑能力。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Title</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{title.length}/500</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Tags</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{tags.length}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</p>
                <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-white">{isPublished ? 'Published' : 'Draft'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <PencilLine className="h-4 w-4" />
              <h2 className="text-lg font-semibold">文章内容</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter an engaging title..."
                  className="w-full rounded-xl border px-4 py-3 text-lg"
                  maxLength={500}
                />
              </div>

              {title && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  /blog/{suggestedSlug}
                </div>
              )}

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
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
              <Tags className="h-4 w-4" />
              <h2 className="text-lg font-semibold">元信息</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">分类</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Tutorial, Editorial, News..."
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
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-xl border px-4 py-3"
                  />
                  <button onClick={handleAddTag} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950">
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isPublished ? '文章会直接公开' : '文章保存为草稿'}
                  </p>
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
            <p className="text-sm font-medium text-slate-900 dark:text-white">写作提示</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-500 dark:text-slate-400">
              <li>开头先给结论，再展开解法或观点。</li>
              <li>代码块尽量加语言名，方便高亮和阅读。</li>
              <li>当前交付不包含图片库和协同编辑。</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/blog')}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium dark:border-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {submitting ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
