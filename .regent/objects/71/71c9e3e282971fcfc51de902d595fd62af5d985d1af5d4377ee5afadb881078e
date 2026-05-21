import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, MessageCircle, ThumbsUp, Edit3, CornerDownRight, X, Pin, CheckCircle, Lock, BookOpen, Send, RefreshCw } from 'lucide-react'
import { discussionsApi } from '@/services/discussionsApi'
import type { DiscussionDetail, DiscussionReply } from '@/types/community'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'
import { useDiscussionUpdates } from '@/hooks/useCommunityUpdates'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function DiscussionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [parentReplyId, setParentReplyId] = useState<number | 'root' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likedReplies, setLikedReplies] = useState<Record<number, boolean>>({})

  const { update } = useDiscussionUpdates(id ? parseInt(id) : undefined)

  useEffect(() => {
    if (!id) return

    const fetchDiscussion = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const data = await discussionsApi.getDiscussion(parseInt(id))
        setDiscussion(data)
      } catch (error) {
        console.error('Failed to fetch discussion:', error)
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchDiscussion()
  }, [id])

  useEffect(() => {
    if (update && discussion) {
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

      if (typeof parentReplyId === 'number') {
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
    return date.toLocaleString('zh-CN')
  }

  const renderReplies = (replies: DiscussionReply[], depth = 0) => {
    return replies.map((reply) => (
      <div
        key={reply.id}
        className={cn(
          depth > 0 ? 'ml-8 mt-4' : 'mt-6',
          'bg-background rounded-xl p-5'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {reply.author_username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {reply.author_username}
            </span>
            {reply.is_solution && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-accepted/10 px-2.5 py-0.5 text-xs font-medium text-status-accepted">
                <CheckCircle className="h-3 w-3" />
                最佳答案
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(reply.created_at)}</span>
        </div>

        <div className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
          {reply.content}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setParentReplyId(reply.id)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            回复
          </button>
          <button
            onClick={() => handleReplyLike(reply.id)}
            className={cn(
              'flex items-center gap-1.5 transition',
              likedReplies[reply.id]
                ? 'text-primary'
                : 'text-muted-foreground hover:text-primary'
            )}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
            {reply.like_count}
          </button>
        </div>

        {reply.replies && reply.replies.length > 0 && renderReplies(reply.replies, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (loadError) {
    return <InlineError title="讨论详情加载失败" onRetry={() => { if (id) { const fetchDiscussion = async () => { setLoading(true); setLoadError(false); try { const data = await discussionsApi.getDiscussion(parseInt(id)); setDiscussion(data); } catch (e) { setLoadError(true); } finally { setLoading(false); } }; fetchDiscussion(); } }} />
  }

  if (!discussion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">讨论未找到</h2>
          <button
            onClick={() => navigate('/discussions')}
            className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            返回讨论区
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/discussions')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          返回讨论区
        </button>
      </div>

      {/* Discussion Card */}
      <article className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8">
          {/* Tags */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {discussion.discussion.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
            {discussion.discussion.is_solved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-accepted/10 px-3 py-1 text-xs font-medium text-status-accepted">
                <CheckCircle className="h-3 w-3" />
                已解决
              </span>
            )}
            {discussion.discussion.is_locked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted-foreground/10 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3" />
                已锁定
              </span>
            )}
            {discussion.problem && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {discussion.problem.title}
              </span>
            )}
            {discussion.discussion.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                #{t}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-tight mb-6">
            {discussion.discussion.title}
          </h1>

          {/* Author & Stats */}
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-border flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {discussion.author.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {discussion.author.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  发布于 {formatDate(discussion.discussion.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {discussion.discussion.view_count}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {discussion.discussion.reply_count}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="text-foreground whitespace-pre-wrap leading-[1.8] text-[15px] mb-8">
            {discussion.discussion.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {user && user.id === discussion.author.id && (
              <button
                onClick={() => navigate(`/discussions/${discussion.discussion.id}/edit`)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background transition"
              >
                <Edit3 className="h-4 w-4" />
                编辑
              </button>
            )}
            <button
              onClick={handleLike}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition',
                liked
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-foreground hover:bg-background'
              )}
            >
              <ThumbsUp className="h-4 w-4" />
              {discussion.discussion.like_count}
            </button>
            {!discussion.discussion.is_locked && (
              <button
                onClick={() => setParentReplyId('root')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                <CornerDownRight className="h-4 w-4" />
                回复
              </button>
            )}
          </div>
        </div>
      </article>

      {/* Reply Form */}
      {parentReplyId !== null && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">
              {typeof parentReplyId === 'number' ? '回复评论' : '撰写回复'}
            </h3>
            <button
              onClick={() => {
                setParentReplyId(null)
                setReplyContent('')
              }}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="写下你的回复..."
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmitReply}
              disabled={!replyContent.trim() || submitting}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? '发布中...' : '发布回复'}
            </button>
          </div>
        </div>
      )}

      {/* Replies Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
        <h2 className="text-lg font-bold text-foreground mb-2">
          回复 ({discussion.replies.length})
        </h2>

        {discussion.replies.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">还没有回复，来发表第一条吧</p>
          </div>
        ) : (
          <div>{renderReplies(discussion.replies)}</div>
        )}
      </div>
    </div>
  )
}
