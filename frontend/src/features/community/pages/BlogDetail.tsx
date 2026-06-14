import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, MessageCircle, ThumbsUp, Edit3, CornerDownRight, X } from 'lucide-react'
import { blogApi } from '@/features/community/services/articlesApi'
import type { ArticleDetail, ArticleComment } from '@/features/community/types/community'
import { DetailSkeleton } from '@/shared/components/DetailSkeleton'
import { InlineError } from '@/shared/components/InlineError'
import { useArticleUpdates } from '@/shared/hooks/useCommunityUpdates'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'

export function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [parentCommentId, setParentCommentId] = useState<number | 'root' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)

  const { update } = useArticleUpdates(slug)

  useEffect(() => {
    if (!slug) return

    const fetchArticle = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const data = await blogApi.getArticle(slug)
        setArticle(data)
      } catch (error) {
        console.error('Failed to fetch article:', error)
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchArticle()
  }, [slug])

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

      if (typeof parentCommentId === 'number') {
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
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderComments = (comments: ArticleComment[], depth = 0) => {
    return comments.map((comment) => (
      <div
        key={comment.id}
        className={cn(
          depth > 0 ? 'ml-8 mt-4' : 'mt-8 pt-8 border-t border-border',
          'bg-background rounded-xl p-5'
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {comment.author_username.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {comment.author_username}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
        </div>

        <div className="text-sm text-muted-foreground leading-relaxed mb-4 whitespace-pre-wrap">
          {comment.content}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={() => setParentCommentId(comment.id)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            回复
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition">
            <ThumbsUp className="h-3.5 w-3.5" />
            {comment.like_count}
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 && renderComments(comment.replies, depth + 1)}
      </div>
    ))
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (loadError) {
    return <InlineError title="文章加载失败" onRetry={() => { if (slug) { const fetchArticle = async () => { setLoading(true); setLoadError(false); try { const data = await blogApi.getArticle(slug); setArticle(data); } catch (e) { setLoadError(true); } finally { setLoading(false); } }; fetchArticle(); } }} />
  }

  if (!article) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">文章未找到</h2>
          <button
            onClick={() => navigate('/blog')}
            className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            返回博客
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
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" />
          返回博客
        </button>
      </div>

      {/* Article Card */}
      <article className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-8 lg:p-10 border-b border-border">
          {/* Tags & Category */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {article.article.is_featured && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                精选
              </span>
            )}
            {article.article.category && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {article.article.category}
              </span>
            )}
            {article.article.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                #{t}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground leading-tight mb-6">
            {article.article.title}
          </h1>

          {/* Author & Stats */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">
                  {article.author.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {article.author.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {article.article.published_at
                    ? formatDate(article.article.published_at)
                    : formatDate(article.article.created_at)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                {article.article.view_count}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4" />
                {article.article.comment_count}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 lg:p-10">
          <div className="max-w-none">
            <div className="text-foreground whitespace-pre-wrap leading-[1.8] text-[15px]">
              {article.article.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-10 pt-8 border-t border-border">
            {user && user.id === article.author.id && (
              <button
                onClick={() => navigate(`/blog/${article.article.slug}/edit`)}
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
              {article.article.like_count} 点赞
            </button>
            <button
              onClick={() => setParentCommentId('root')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              <MessageCircle className="h-4 w-4" />
              评论
            </button>
          </div>
        </div>
      </article>

      {/* Comment Form */}
      {parentCommentId !== null && (
        <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">
              {typeof parentCommentId === 'number' ? '回复评论' : '撰写评论'}
            </h3>
            <button
              onClick={() => {
                setParentCommentId(null)
                setCommentContent('')
              }}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder="分享你的想法..."
            rows={4}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmitComment}
              disabled={!commentContent.trim() || submitting}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? '发布中...' : '发布评论'}
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-foreground mb-2">
          评论 ({article.comments.length})
        </h2>

        {article.comments.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">还没有评论，来发表第一条吧</p>
            <button
              onClick={() => setParentCommentId('root')}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              撰写评论
            </button>
          </div>
        ) : (
          <div>{renderComments(article.comments)}</div>
        )}
      </div>
    </div>
  )
}
