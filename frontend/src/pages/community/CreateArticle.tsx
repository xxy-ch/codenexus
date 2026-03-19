import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, PencilLine, Send, Tag, Upload } from 'lucide-react'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { ActionBar } from '@/components/page/ActionBar'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        breadcrumb={['Blog', 'Authoring']}
        title="Article Draft"
        description="把标题、标签、分类和正文压缩在一张编辑画布里。当前仍走真实博客创建接口，不新增任何中间保存协议。"
        actions={
          <Button variant="outline" onClick={() => navigate('/blog')}>
            <ArrowLeft className="h-4 w-4" />
            Back To Blog
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Title Length</p>
          <p className="text-2xl font-semibold text-slate-950">{title.length}</p>
          <p className="text-sm text-slate-600">上限 500 个字符</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Tags</p>
          <p className="text-2xl font-semibold text-slate-950">{tags.length}</p>
          <p className="text-sm text-slate-600">用于归档和检索</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Publish State</p>
          <p className="text-2xl font-semibold text-slate-950">{isPublished ? 'Live' : 'Draft'}</p>
          <p className="text-sm text-slate-600">提交时仍沿用原有发布字段</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionBlock
          title="Writing Workspace"
          description="保持单一写作任务流，只保留标题与正文输入，不叠加额外营销式说明。"
        >
          <div className="space-y-5">
            <FieldGroup
              label="Article title"
              description={suggestedSlug ? `/blog/${suggestedSlug}` : 'slug 将按标题自动推导'}
            >
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Summarize the result or the main angle first"
                maxLength={500}
              />
            </FieldGroup>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Article body</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="Write the article in Markdown. Keep the first paragraph useful even without scrolling."
              />
            </div>
          </div>
        </SectionBlock>

        <div className="space-y-6">
          <SectionBlock
            title="Publishing Details"
            description="这些字段直接映射到现有创建文章接口，不改 payload 形状。"
          >
            <div className="space-y-5">
              <FieldGroup label="Category" description="可留空，后端仍按原逻辑处理 undefined。">
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Editorial, Tutorial, News"
                />
              </FieldGroup>

              <FieldGroup label="Add tag" description="回车或点击按钮添加，重复标签会被忽略。">
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
                    placeholder="algorithm"
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
                  <p className="mt-1 text-sm text-slate-600">关闭时默认作为草稿保留，仍由 `is_published` 控制。</p>
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
              <FileText className="h-4 w-4 text-slate-500" />
              Authoring Notes
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              <p>先写结论，再补推导过程或背景。</p>
              <p>代码块保留语言名，便于阅读器高亮。</p>
              <p>这次只做视觉收口，不增加协同编辑、版本树和资源库。</p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <ActionBar>
        <Button variant="ghost" onClick={() => navigate('/blog')}>
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <PencilLine className="h-4 w-4" />
          {submitting ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting || !title.trim() || !content.trim()}
          aria-label="Publish article"
        >
          {submitting ? <Upload className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Publishing...' : 'Publish Article'}
        </Button>
      </ActionBar>
    </div>
  )
}
