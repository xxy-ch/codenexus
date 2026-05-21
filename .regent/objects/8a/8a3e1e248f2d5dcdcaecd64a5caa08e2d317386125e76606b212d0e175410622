import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, X, Send, RefreshCw, Lightbulb } from 'lucide-react'
import { discussionsApi } from '@/services/discussionsApi'
import type { CreateDiscussionRequest } from '@/types/community'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'

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
      alert('请填写标题和内容')
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
      alert(error.response?.data?.message || '发起讨论失败')
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

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <button
                onClick={() => navigate('/discussions')}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4" />
                返回讨论区
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {problemId ? '提问' : '发起讨论'}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  清晰地描述你的问题或讨论主题，使用 Markdown 格式化代码和内容。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Title */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标题 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="你的问题或讨论主题是什么？"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={500}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{title.length}/500 字符</p>
              </div>

              {/* Content */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">内容 *</label>
                <EditorWithPreview
                  value={content}
                  onChange={setContent}
                  placeholder="详细描述你的问题或讨论主题。可以使用 Markdown 格式..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-4">标签（可选）</h2>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="添加标签..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleAddTag}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                添加
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              发起讨论的技巧
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>具体、清晰地描述你的问题</li>
              <li>包含相关的代码片段和示例</li>
              <li>说明你已经尝试过的方法</li>
              <li>使用合适的标签帮助他人找到你的讨论</li>
              <li>代码块使用三引号加语言名格式化</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex-1 rounded-xl border border-border px-5 py-3 text-sm font-medium text-foreground hover:bg-background transition"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  发布中...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  发布讨论
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
