import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Send, Sparkles, Tag } from 'lucide-react'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { ActionBar } from '@/components/page/ActionBar'
import { FieldGroup } from '@/components/page/FieldGroup'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { discussionsApi } from '@/services/communityApi'
import type { CreateDiscussionRequest } from '@/types/community'

export function CreateDiscussion() {
  const navigate = useNavigate()
  const { problemId } = useParams()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content')
      return
    }

    setSubmitting(true)
    try {
      const data: CreateDiscussionRequest = {
        title,
        content,
        problem_id: problemId ? parseInt(problemId) : undefined,
        tags: tags.length > 0 ? tags : undefined,
      }

      const discussion = await discussionsApi.createDiscussion(data)
      navigate(`/discussions/${discussion.id}`)
    } catch (error: any) {
      console.error('Failed to create discussion:', error)
      alert(error.response?.data?.message || 'Failed to create discussion')
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community"
        breadcrumb={problemId ? ['Problems', problemId, 'Discussion'] : ['Discussions', 'New']}
        title="New Discussion"
        description={
          problemId
            ? '围绕当前题目发起讨论或提问。提交时仍使用原有 `problem_id` 语义，不更改请求结构。'
            : '发起一个新的社区讨论。页面只保留标题、标签和正文三块核心输入。'
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/discussions')}>
            <ArrowLeft className="h-4 w-4" />
            Back To Discussions
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Question Length</p>
          <p className="text-2xl font-semibold text-slate-950">{title.length}</p>
          <p className="text-sm text-slate-600">建议标题先给出问题核心</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Tags</p>
          <p className="text-2xl font-semibold text-slate-950">{tags.length}</p>
          <p className="text-sm text-slate-600">会继续按数组发给后端</p>
        </SurfaceCard>
        <SurfaceCard className="space-y-2 p-5">
          <p className="text-sm font-medium text-slate-500">Problem Link</p>
          <p className="text-2xl font-semibold text-slate-950">{problemId || 'None'}</p>
          <p className="text-sm text-slate-600">有题号时才会带上 `problem_id`</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SectionBlock
          title="Discussion Workspace"
          description="让提问和展开背景都在同一工作区完成，减少额外装饰。"
        >
          <div className="space-y-5">
            <FieldGroup label="Discussion title" description="标题越具体，后续回复质量通常越高。">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What exactly is blocked?"
                maxLength={500}
              />
            </FieldGroup>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Discussion body</label>
              <EditorWithPreview
                value={content}
                onChange={setContent}
                placeholder="Describe the context, the attempt you already made, and the exact point where it breaks."
              />
            </div>
          </div>
        </SectionBlock>

        <div className="space-y-6">
          <SectionBlock
            title="Tags"
            description="标签是可选的；不填时仍保持原来的 undefined 行为。"
          >
            <div className="space-y-5">
              <FieldGroup label="Add tag" description="回车或点击按钮添加标签。">
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
                    placeholder="dp"
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
            </div>
          </SectionBlock>

          <SurfaceCard tone="muted" className="space-y-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
              <Sparkles className="h-4 w-4 text-slate-500" />
              Writing Prompt
            </div>
            <div className="space-y-2 text-sm leading-6 text-slate-600">
              <p>交代输入、预期输出和你已经尝试过的思路。</p>
              <p>如果是代码问题，正文里直接贴最小可复现片段。</p>
              <p>页面不新增草稿箱、提问模板库或私有讨论流。</p>
            </div>
          </SurfaceCard>
        </div>
      </div>

      <ActionBar>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}>
          {submitting ? <HelpCircle className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Posting...' : 'Post Discussion'}
        </Button>
      </ActionBar>
    </div>
  )
}
