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
    <div className="space-y-6">
      <PageHeader
        eyebrow="社区"
        breadcrumb={['博客', '撰写']}
        title="撰写文章"
        description="把标题、正文、分类和标签收进同一张编辑画布，保持写作流程简洁直接。"
        actions={
          <Button variant="outline" onClick={() => navigate('/blog')}>
            <ArrowLeft className="h-4 w-4" />
            返回博客
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">标题长度</p>
          <p className="text-2xl font-semibold text-slate-950">{title.length}</p>
          <p className="text-sm text-slate-600">上限 500 个字符</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">标签数</p>
          <p className="text-2xl font-semibold text-slate-950">{tags.length}</p>
          <p className="text-sm text-slate-600">用于归档和检索</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">发布状态</p>
          <p className="text-2xl font-semibold text-slate-950">{isPublished ? '已发布' : '草稿'}</p>
          <p className="text-sm text-slate-600">提交时仍沿用原有发布字段</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionBlock
          title="编辑工作台"
          description="把标题、正文、分类和标签放在同一工作台内，减少来回切换。"
        >
          <div className="space-y-5">
            <FieldGroup label="文章标题" description={suggestedSlug ? `/blog/${suggestedSlug}` : 'slug 将按标题自动推导'}>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="先写清文章的核心结论"
                maxLength={500}
              />
            </FieldGroup>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">文章正文</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="用 Markdown 写正文，首段尽量先把结论说清楚。"
              />
            </div>
          </div>
        </SectionBlock>

        <div className="space-y-6">
          <SectionBlock
            title="发布信息"
            description="这些字段直接映射到现有创建文章接口，不改 payload 形状。"
          >
            <div className="space-y-5">
              <FieldGroup label="分类" description="可留空，后端仍按原逻辑处理 undefined。">
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="题解、教程、公告"
                />
              </FieldGroup>

              <FieldGroup label="添加标签" description="回车或点击按钮添加，重复标签会被忽略。">
                <div className="flex gap-2">
                  <Input
                    aria-label="添加标签"
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
                    <Tag className="h-4 w-4" />
                    添加标签
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
                  <p className="text-sm font-medium text-slate-950">立即发布</p>
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
              写作提示
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
          取消
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={submitting || !title.trim() || !content.trim()}
        >
          <PencilLine className="h-4 w-4" />
          {submitting ? '正在保存...' : '保存草稿'}
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={submitting || !title.trim() || !content.trim()}
          aria-label="发布文章"
        >
          {submitting ? <Upload className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? '发布中...' : '发布文章'}
        </Button>
      </ActionBar>
    </div>
  )
}
