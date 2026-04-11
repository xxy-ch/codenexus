import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { blogApi } from '@/services/articlesApi'
import type { ArticleDetail, ArticleComment } from '@/types/community'
import { Loading } from '@/components/ui/Loading'
import { useArticleUpdates } from '@/hooks/useCommunityUpdates'
import { useAuth } from '@/hooks/useAuth'

export function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [commentContent, setCommentContent] = useState('')
  const [parentCommentId, setParentCommentId] = useState<number | 'root' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)

  // WebSocket real-time updates
  const { update } = useArticleUpdates(slug)

  useEffect(() => {
    if (!slug) return

    const fetchArticle = async () => {
      setLoading(true)
      try {
        const data = await blogApi.getArticle(slug)
        setArticle(data)
      } catch (error) {
        console.error('Failed to fetch article:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

  // Handle real-time comment updates
  useEffect(() => {
    if (update && article) {
      const newComment: ArticleComment = {
        id: update.comment_id,
        article_id: update.article_id,
        content: update.content,
        author_id: update.user_id,
        author_username: update.username,
        like_count: 0,
        created_at: update.created_at,
        updated_at: update.created_at,
      }

      setArticle((prev) => {
        if (!prev) return null
        return {
          ...prev,
          comments: [...prev.comments, newComment],
        }
      })
    }
  }, [update])

  const handleSubmitComment = async () => {
    if (!commentContent.trim() || !article) return

    setSubmitting(true)
    try {
      const comment = await blogApi.createComment(article.article.slug, {
        content: commentContent,
        parent_comment_id: typeof parentCommentId === 'number' ? parentCommentId : undefined,
      })

      // Add comment to the article
      if (typeof parentCommentId === 'number') {
        // Nested comment - add to parent's comments
        setArticle((prev) => {
          if (!prev) return null
          const addNestedComment = (comments: ArticleComment[]): ArticleComment[] => {
            return comments.map((c) => {
              if (c.id === parentCommentId) {
                return {
                  ...c,
                  replies: [...(c.replies || []), comment],
                }
              }
              if (c.replies) {
                return {
                  ...c,
                  replies: addNestedComment(c.replies),
                }
              }
              return c
            })
          }
          return {
            ...prev,
            comments: addNestedComment(prev.comments),
          }
        })
      } else {
        // Top-level comment
        setArticle((prev) => {
          if (!prev) return null
          return {
            ...prev,
            comments: [...prev.comments, comment],
          }
        })
      }

      setCommentContent('')
      setParentCommentId(null)
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!article) return

    try {
      const result = await blogApi.likeArticle(article.article.id)
      setLiked(result.liked)
      setArticle((prev) => {
        if (!prev) return null
        const nextLikeCount = result.like_count >= 0
          ? result.like_count
          : Math.max(0, prev.article.like_count + (result.liked ? 1 : -1))
        return {
          ...prev,
          article: {
            ...prev.article,
            like_count: nextLikeCount,
          },
        }
      })
    } catch (error) {
      console.error('Failed to like article:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderComments = (comments: ArticleComment[], depth = 0) => {
    return comments.map((comment) => (
      <div
        key={comment.id}
        className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-6 pt-6 border-t border-gray-100 dark:border-gray-800'} bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4`}
      >
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {comment.author_username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {comment.author_username}
            </span>
          </div>
          <span className="text-xs text-text-muted">{formatDate(comment.created_at)}</span>
        </div>

        {/* Comment Content */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
          {comment.content}
        </div>

        {/* Comment Actions */}
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setParentCommentId(comment.id)}
            className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
          >
            <span className="material-icons text-base">reply</span>
            Reply
          </button>
          <button className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors">
            <span className="material-icons text-base">thumb_up</span>
            {comment.like_count}
          </button>
        </div>

        {/* Nested Comments */}
        {comment.replies && comment.replies.length > 0 && renderComments(comment.replies, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return <Loading message="Loading article..." />
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons text-6xl text-text-muted mb-4">error_outline</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Article not found
          </h2>
          <button
            onClick={() => navigate('/blog')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
          >
            Back to Blog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/blog')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blog</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Article */}
        <article className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden mb-8">
          {/* Article Header */}
          <div className="p-8 pb-6 border-b border-gray-100 dark:border-gray-800">
            {/* Tags & Category */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {article.article.is_featured && (
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase">
                  Featured
                </span>
              )}
              {article.article.category && (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  {article.article.category}
                </span>
              )}
              {article.article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {article.article.title}
            </h1>

            {/* Author & Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-base font-semibold text-primary">
                    {article.author.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {article.author.username}
                  </div>
                  <div className="text-xs text-text-muted">
                    {article.article.published_at
                      ? formatDate(article.article.published_at)
                      : formatDate(article.article.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-text-muted text-sm">
                <span className="flex items-center gap-1">
                  <span className="material-icons text-base">visibility</span>
                  {article.article.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-icons text-base">chat_bubble_outline</span>
                  {article.article.comment_count}
                </span>
              </div>
            </div>
          </div>

          {/* Article Content */}
          <div className="p-8">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {article.article.content}
              </div>
            </div>

            {/* Article Actions */}
            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              {user && user.id === article.author.id && (
                <button
                  onClick={() => navigate(`/blog/${article.article.slug}/edit`)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-icons text-lg">edit</span>
                  Edit
                </button>
              )}
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
                  liked
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="material-icons text-lg">thumb_up</span>
                {article.article.like_count} Likes
              </button>
              <button
                onClick={() => setParentCommentId('root')}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                <span className="material-icons text-lg">comment</span>
                Comment
              </button>
            </div>
          </div>
        </article>

        {/* Comment Form */}
        {parentCommentId !== null && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {typeof parentCommentId === 'number' ? 'Reply to comment' : 'Write a comment'}
              </h3>
              <button
                onClick={() => {
                  setParentCommentId(null)
                  setCommentContent('')
                }}
                className="text-text-muted hover:text-gray-900 dark:hover:text-white"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-3 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmitComment}
                disabled={!commentContent.trim() || submitting}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Comments ({article.comments.length})
          </h2>

          {article.comments.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-icons text-5xl text-text-muted mb-3">chat_bubble_outline</span>
              <p className="text-text-muted mb-4">No comments yet. Be the first to comment!</p>
              <button
                onClick={() => setParentCommentId('root')}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Write a Comment
              </button>
            </div>
          ) : (
            <div>{renderComments(article.comments)}</div>
          )}
        </div>
      </main>
    </div>
  )
}
