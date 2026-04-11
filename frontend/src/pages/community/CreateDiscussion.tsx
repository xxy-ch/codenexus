import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { discussionsApi } from '@/services/discussionsApi'
import type { CreateDiscussionRequest } from '@/types/community'
import { EditorWithPreview } from '@/components/editor/EditorWithPreview'
import { Loading } from '@/components/ui/Loading'

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
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/discussions')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {problemId ? 'Ask Question' : 'Start Discussion'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's your question or discussion topic?"
              className="w-full px-4 py-3 text-lg border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={500}
            />
            <p className="mt-1 text-xs text-text-muted">{title.length}/500 characters</p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (optional)
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add a tag..."
                className="flex-1 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Add
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <span className="material-icons text-[14px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <EditorWithPreview
              value={content}
              onChange={setContent}
              placeholder="Describe your question or topic in detail. You can use Markdown to format your text..."
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
              <span className="material-icons text-[18px]">tips_and_updates</span>
              Tips for a good discussion
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>Be specific and clear about your question</li>
              <li>Include relevant code snippets or examples</li>
              <li>Mention what you've already tried</li>
              <li>Use appropriate tags to help others find your discussion</li>
              <li>Format code blocks with triple backticks and language name</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 border border-border-light dark:border-border-dark rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-icons animate-spin">refresh</span>
                  Posting...
                </>
              ) : (
                <>
                  <span className="material-icons">send</span>
                  Post Discussion
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
