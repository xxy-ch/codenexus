import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { discussionsApi } from '@/services/communityApi'
import type { DiscussionDetail, DiscussionReply } from '@/types/community'
import { Loading } from '@/components/ui/Loading'
import { useDiscussionUpdates } from '@/hooks/useCommunityUpdates'
import { useAuth } from '@/hooks/useAuth'

export function DiscussionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [parentReplyId, setParentReplyId] = useState<number | 'root' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likedReplies, setLikedReplies] = useState<Record<number, boolean>>({})

  // WebSocket real-time updates
  const { update } = useDiscussionUpdates(id ? parseInt(id) : undefined)

  useEffect(() => {
    if (!id) return

    const fetchDiscussion = async () => {
      setLoading(true)
      try {
        const data = await discussionsApi.getDiscussion(parseInt(id))
        setDiscussion(data)
      } catch (error) {
        console.error('Failed to fetch discussion:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDiscussion()
  }, [id])

  // Handle real-time reply updates
  useEffect(() => {
    if (update && discussion) {
      // Add new reply to the discussion
      const newReply: DiscussionReply = {
        id: update.reply_id,
        discussion_id: update.discussion_id,
        content: update.content,
        author_id: update.user_id,
        author_username: update.username,
        like_count: 0,
        is_solution: false,
        created_at: update.created_at,
        updated_at: update.created_at,
      }

      setDiscussion((prev) => {
        if (!prev) return null
        return {
          ...prev,
          replies: [...prev.replies, newReply],
        }
      })
    }
  }, [update])

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !discussion) return

    setSubmitting(true)
    try {
      const reply = await discussionsApi.createReply(discussion.discussion.id, {
        content: replyContent,
        parent_reply_id: typeof parentReplyId === 'number' ? parentReplyId : undefined,
      })

      // Add reply to the discussion
      if (typeof parentReplyId === 'number') {
        // Nested reply - add to parent's replies
        setDiscussion((prev) => {
          if (!prev) return null
          const addNestedReply = (replies: DiscussionReply[]): DiscussionReply[] => {
            return replies.map((r) => {
              if (r.id === parentReplyId) {
                return {
                  ...r,
                  replies: [...(r.replies || []), reply],
                }
              }
              if (r.replies) {
                return {
                  ...r,
                  replies: addNestedReply(r.replies),
                }
              }
              return r
            })
          }
          return {
            ...prev,
            replies: addNestedReply(prev.replies),
          }
        })
      } else {
        // Top-level reply
        setDiscussion((prev) => {
          if (!prev) return null
          return {
            ...prev,
            replies: [...prev.replies, reply],
          }
        })
      }

      setReplyContent('')
      setParentReplyId(null)
    } catch (error) {
      console.error('Failed to create reply:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async () => {
    if (!discussion) return

    try {
      const result = await discussionsApi.likeDiscussion(discussion.discussion.id)
      setLiked(result.liked)
      setDiscussion((prev) => {
        if (!prev) return null
        const nextLikeCount = result.like_count >= 0
          ? result.like_count
          : Math.max(0, prev.discussion.like_count + (result.liked ? 1 : -1))
        return {
          ...prev,
          discussion: {
            ...prev.discussion,
            like_count: nextLikeCount,
          },
        }
      })
    } catch (error) {
      console.error('Failed to like discussion:', error)
    }
  }

  const handleReplyLike = async (replyId: number) => {
    if (!discussion) return

    try {
      const result = await discussionsApi.likeReply(replyId)

      setLikedReplies((prev) => ({
        ...prev,
        [replyId]: result.liked,
      }))

      setDiscussion((prev) => {
        if (!prev) return null

        const updateLikeCount = (replies: DiscussionReply[]): DiscussionReply[] =>
          replies.map((reply) => {
            if (reply.id === replyId) {
              const nextLikeCount = result.like_count >= 0
                ? result.like_count
                : Math.max(0, reply.like_count + (result.liked ? 1 : -1))
              return {
                ...reply,
                like_count: nextLikeCount,
              }
            }

            if (reply.replies && reply.replies.length > 0) {
              return {
                ...reply,
                replies: updateLikeCount(reply.replies),
              }
            }

            return reply
          })

        return {
          ...prev,
          replies: updateLikeCount(prev.replies),
        }
      })
    } catch (error) {
      console.error('Failed to like reply:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const renderReplies = (replies: DiscussionReply[], depth = 0) => {
    return replies.map((reply) => (
      <div
        key={reply.id}
        className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'} bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4`}
      >
        {/* Reply Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {reply.author_username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {reply.author_username}
            </span>
            {reply.is_solution && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="material-icons text-[14px]">check_circle</span>
                Solution
              </span>
            )}
          </div>
          <span className="text-xs text-text-muted">{formatDate(reply.created_at)}</span>
        </div>

        {/* Reply Content */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
          {reply.content}
        </div>

        {/* Reply Actions */}
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setParentReplyId(reply.id)}
            className="flex items-center gap-1 text-text-muted hover:text-primary transition-colors"
          >
            <span className="material-icons text-base">reply</span>
            Reply
          </button>
          <button
            onClick={() => handleReplyLike(reply.id)}
            className={`flex items-center gap-1 transition-colors ${
              likedReplies[reply.id]
                ? 'text-primary'
                : 'text-text-muted hover:text-primary'
            }`}
          >
            <span className="material-icons text-base">
              {likedReplies[reply.id] ? 'thumb_up' : 'thumb_up_off_alt'}
            </span>
            {reply.like_count}
          </button>
        </div>

        {/* Nested Replies */}
        {reply.replies && reply.replies.length > 0 && renderReplies(reply.replies, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return <Loading message="Loading discussion..." />
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-icons text-6xl text-text-muted mb-4">error_outline</span>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Discussion not found
          </h2>
          <button
            onClick={() => navigate('/discussions')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg"
          >
            Back to Discussions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/discussions')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              Discussion
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Discussion */}
        <article className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden mb-6">
          <div className="p-6">
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {discussion.discussion.is_pinned && (
                <span className="bg-primary/10 text-primary text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase">
                  Pinned
                </span>
              )}
              {discussion.discussion.is_solved && (
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="material-icons text-[14px]">check_circle</span>
                  Solved
                </span>
              )}
              {discussion.discussion.is_locked && (
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <span className="material-icons text-[14px]">lock</span>
                  Locked
                </span>
              )}
              {discussion.problem && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {discussion.problem.title}
                </span>
              )}
              {discussion.discussion.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {discussion.discussion.title}
            </h1>

            {/* Author & Stats */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-base font-semibold text-primary">
                    {discussion.author.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {discussion.author.username}
                  </div>
                  <div className="text-xs text-text-muted">
                    Posted on {formatDate(discussion.discussion.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-text-muted text-sm">
                <span className="flex items-center gap-1">
                  <span className="material-icons text-base">visibility</span>
                  {discussion.discussion.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-icons text-base">chat_bubble_outline</span>
                  {discussion.discussion.reply_count}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-6">
              {discussion.discussion.content}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {user && user.id === discussion.author.id && (
                <button
                  onClick={() => navigate(`/discussions/${discussion.discussion.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="material-icons text-lg">edit</span>
                  Edit
                </button>
              )}
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  liked
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="material-icons text-lg">thumb_up</span>
                {discussion.discussion.like_count}
              </button>
              {!discussion.discussion.is_locked && (
                <button
                  onClick={() => setParentReplyId('root')}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
                >
                  <span className="material-icons text-lg">reply</span>
                  Reply
                </button>
              )}
            </div>
          </div>
        </article>

        {/* Reply Form */}
        {parentReplyId !== null && (
          <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {typeof parentReplyId === 'number' ? 'Reply to comment' : 'Write a reply'}
              </h3>
              <button
                onClick={() => {
                  setParentReplyId(null)
                  setReplyContent('')
                }}
                className="text-text-muted hover:text-gray-900 dark:hover:text-white"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              rows={4}
              className="w-full px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || submitting}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Posting...' : 'Post Reply'}
              </button>
            </div>
          </div>
        )}

        {/* Replies Section */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Replies ({discussion.replies.length})
          </h2>

          {discussion.replies.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-icons text-4xl text-text-muted mb-2">forum</span>
              <p className="text-text-muted">No replies yet. Be the first to reply!</p>
            </div>
          ) : (
            <div>{renderReplies(discussion.replies)}</div>
          )}
        </div>
      </main>
    </div>
  )
}
