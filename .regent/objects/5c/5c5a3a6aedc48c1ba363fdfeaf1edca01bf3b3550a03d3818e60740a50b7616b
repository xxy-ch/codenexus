import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, PencilLine, Save, Send, Tags, X } from 'lucide-react'
import { blogApi } from '@/services/articlesApi'
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
      alert('请填写标题和内容')
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
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-4">
              <button
                onClick={() => navigate('/blog')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" />
                返回博客
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">撰写文章</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  使用动态编辑器、预览面板和真实博客接口撰写文章。支持题解、教程和公告类正文编辑。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">标题</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{title.length}/500</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">标签</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{tags.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">状态</p>
                <p className="mt-1.5 text-sm font-bold text-foreground">{isPublished ? '已发布' : '草稿'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Layout */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <PencilLine className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">文章内容</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入一个引人注目的标题..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={500}
                />
              </div>

              {title && (
                <div className="rounded-xl bg-background border border-border px-4 py-3 text-sm text-muted-foreground">
                  /blog/{suggestedSlug}
                </div>
              )}

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
        </div>

        <div className="space-y-6">
          {/* Metadata */}
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
                  placeholder="教程、题解、公告..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标签</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="添加标签..."
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={handleAddTag} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition">
                    添加
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag}
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
                  <p className="text-xs text-muted-foreground mt-0.5">
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

          {/* Writing Tips */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <p className="text-sm font-bold text-foreground">写作提示</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground leading-relaxed">
              <li>开头先给结论，再展开解法或观点。</li>
              <li>代码块尽量加语言名，方便高亮和阅读。</li>
              <li>当前交付不包含图片库和协同编辑。</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/blog')}
              className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-background transition"
            >
              取消
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50 transition"
            >
              <Save className="h-4 w-4" />
              {submitting ? '保存中...' : '保存草稿'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              {submitting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
