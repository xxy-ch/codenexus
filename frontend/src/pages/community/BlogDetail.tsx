import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
import type { ArticleComment, ArticleDetail } from '@/types/community'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { useArticleUpdates } from '@/hooks/useCommunityUpdates'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

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
  }, [update, article])

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
          const addNestedComment = (comments: ArticleComment[]): ArticleComment[] =>
            comments.map((c) => {
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
        const nextLikeCount =
          result.like_count >= 0
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const renderComments = (comments: ArticleComment[], depth = 0): JSX.Element[] =>
    comments.map((comment) => (
      <div
        key={comment.id}
        className={cn(
          'rounded-2xl border border-slate-200 bg-slate-50/80 p-4',
          depth > 0 ? 'ml-6 mt-3' : '',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {comment.author_username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-950">{comment.author_username}</span>
          </div>
          <span className="text-xs text-slate-400">{formatDate(comment.created_at)}</span>
        </div>

        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.content}</div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setParentCommentId(comment.id)}
            className="text-slate-500 transition hover:text-slate-900"
          >
            回复
          </button>
          <button type="button" className="text-slate-500 transition hover:text-slate-900">
            赞同 {comment.like_count}
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 ? renderComments(comment.replies, depth + 1) : null}
      </div>
    ))

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="Loading article..." />
      </div>
    )
  }

  if (!article) {
    return (
      <EmptyState
        title="Article not found"
        description="当前文章无法读取。"
        action={
          <Button variant="primary" onClick={() => navigate('/blog')}>
            Back to Blog
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Blog"
        breadcrumb={['Blog', article.article.title]}
        title={article.article.title}
        description={article.article.excerpt || '文章详情页'}
        actions={
          <Button variant="outline" onClick={() => navigate('/blog')}>
            返回博客
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {article.article.is_featured ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Featured
          </span>
        ) : null}
        {article.article.category ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {article.article.category}
          </span>
        ) : null}
        {article.article.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionBlock title="正文" description="正文和评论分离，阅读优先。">
            <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{article.article.content}</div>
          </SectionBlock>

          {parentCommentId !== null ? (
            <SectionBlock
              title={typeof parentCommentId === 'number' ? '回复评论' : '写评论'}
              description="提交后会直接写入当前文章评论流。"
            >
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Share your thoughts..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setParentCommentId(null)
                    setCommentContent('')
                  }}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmitComment}
                  disabled={!commentContent.trim() || submitting}
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </SectionBlock>
          ) : null}

          <SectionBlock title={`Comments (${article.comments.length})`} description="支持嵌套回复。">
            {article.comments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">No comments yet. Be the first to comment!</p>
                <div className="mt-4">
                  <Button variant="primary" onClick={() => setParentCommentId('root')}>
                    Write a Comment
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">{renderComments(article.comments)}</div>
            )}
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {article.author.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-950">{article.author.username}</p>
                <p className="text-sm text-slate-500">
                  {article.article.published_at
                    ? formatDate(article.article.published_at)
                    : formatDate(article.article.created_at)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Views</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{article.article.view_count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Comments</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{article.article.comment_count}</p>
              </div>
            </div>
            <div className="space-y-3">
              {user && user.id === article.author.id ? (
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate(`/blog/${article.article.slug}/edit`)}
                >
                  Edit
                </Button>
              ) : null}
              <Button
                fullWidth
                variant={liked ? 'primary' : 'outline'}
                onClick={handleLike}
              >
                {article.article.like_count} Likes
              </Button>
              <Button fullWidth variant="primary" onClick={() => setParentCommentId('root')}>
                Comment
              </Button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
