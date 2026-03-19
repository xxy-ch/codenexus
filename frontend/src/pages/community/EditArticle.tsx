import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw, Save, Send, Tag } from 'lucide-react'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { ActionBar } from '@/components/page/ActionBar'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
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
        <Loading message="加载文章中..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        breadcrumb={['Blog', slug || 'Article', 'Edit']}
        title="Revise Article"
        description="围绕同一篇文章继续修改标题、正文和发布状态。仍然只调用现有文章详情与更新接口，不引入额外版本流。"
        actions={
          <Button variant="outline" onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}>
            <ArrowLeft className="h-4 w-4" />
            Back To Article
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Current State</p>
          <p className="text-2xl font-semibold text-slate-950">{isPublished ? 'Published' : 'Draft'}</p>
          <p className="text-sm text-slate-600">保存草稿时会覆盖回 `is_published: false`。</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Tags</p>
          <p className="text-2xl font-semibold text-slate-950">{tags.length}</p>
          <p className="text-sm text-slate-600">沿用原数组字段提交</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Title Length</p>
          <p className="text-2xl font-semibold text-slate-950">{title.length}</p>
          <p className="text-sm text-slate-600">更新时会保持标题 trim 逻辑</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionBlock
          title="Editing Workspace"
          description="把编辑主任务压缩成标题与正文两块，减少边缘说明和视觉噪音。"
        >
          <div className="space-y-5">
            <FieldGroup label="Article title" description="仍以当前 slug 对应文章为更新目标。">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={500}
              />
            </FieldGroup>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Article body</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="Revise the article body in Markdown."
              />
            </div>
          </div>
        </SectionBlock>

        <div className="space-y-6">
          <SectionBlock
            title="Metadata"
            description="这些值仍按原样映射到更新 payload。"
          >
            <div className="space-y-5">
              <FieldGroup label="Category" description="可留空，仍会回落成 undefined。">
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                />
              </FieldGroup>

              <FieldGroup label="Add tag" description="重复标签不会加入，点击已有标签可移除。">
                <div className="flex gap-2">
                  <Input
                    aria-label="Add tag"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        handleAddTag()
                      }
                    }}
                    placeholder="editorial"
                  />
                  <Button variant="outline" onClick={handleAddTag} className="shrink-0">
                    <Tag className="h-4 w-4" />
                    Add Tag
                  </Button>
                </div>
              </FieldGroup>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}

              <label className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-950">Publish immediately</p>
                  <p className="mt-1 text-sm text-slate-600">关闭后会按现有行为保存为草稿。</p>
                </div>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(event) => setIsPublished(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
              </label>
            </div>
          </SectionBlock>

          <SurfaceCard tone="muted" className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
              <RefreshCw className="h-4 w-4 text-slate-500" />
              Scope
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              <p>保留原有鉴权判断和 slug 跳转。</p>
              <p>不增加版本历史、评论预审或多作者协同。</p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <ActionBar>
        <Button variant="ghost" onClick={() => navigate(slug ? `/blog/${slug}` : '/blog')}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !content.trim()}
          aria-label="Save article"
        >
          {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitting ? 'Saving...' : 'Save Article'}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <Send className="h-4 w-4" />
          {submitting ? 'Publishing...' : 'Publish Article'}
        </Button>
      </ActionBar>
    </div>
  )
}
