import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
import type { ArticleComment, ArticleDetail } from '@/types/community'
import { LoadingState } from '@/components/ui/LoadingState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
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
          'rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4',
          depth > 0 ? 'ml-6 mt-3' : '',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-surface">
              {comment.author_username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-on-surface">{comment.author_username}</span>
          </div>
          <span className="text-xs text-on-surface-variant">{formatDate(comment.created_at)}</span>
        </div>

        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">{comment.content}</div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setParentCommentId(comment.id)}
            className="text-on-surface-variant transition hover:text-primary"
          >
            回复
          </button>
          <button type="button" className="text-on-surface-variant transition hover:text-primary">
            赞同 {comment.like_count}
          </button>
        </div>

        {comment.replies && comment.replies.length > 0 ? renderComments(comment.replies, depth + 1) : null}
      </div>
    ))

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState message="正在加载文章..." />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="文章未找到"
          description="当前文章无法读取，请返回博客列表后重试。"
          action={{ label: '返回博客', onClick: () => navigate('/blog') }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            社区 / 博客 / {article.article.title}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            {article.article.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {article.article.excerpt || '文章详情页'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/blog')}>
          <span className="material-symbols-outlined text-base">arrow_back</span>
          返回博客
        </Button>
      </div>

      {/* Tags */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {article.article.is_featured ? (
          <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            精选文章
          </span>
        ) : null}
        {article.article.category ? (
          <span className="shrink-0 rounded-full bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface">
            {article.article.category}
          </span>
        ) : null}
        {article.article.tags.map((tag) => (
          <span
            key={tag}
            className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-semibold text-on-surface-variant"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main Content */}
        <div className="space-y-6">
          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">文章正文</h2>
            <p className="mt-1 text-sm text-on-surface-variant">正文和评论分开呈现，阅读优先。</p>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-8 text-on-surface">{article.article.content}</div>
          </Card>

          {parentCommentId !== null ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                {typeof parentCommentId === 'number' ? '回复评论' : '写评论'}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">提交后会直接写入当前文章评论流。</p>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="写下你对这篇文章的补充、修正或追问。"
                rows={4}
                className="mt-5 w-full resize-none rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition focus:ring-2 focus:ring-primary/20"
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
                  onClick={handleSubmitComment}
                  disabled={!commentContent.trim() || submitting}
                >
                  {submitting ? '发布中...' : '发布评论'}
                </Button>
              </div>
            </Card>
          ) : null}

          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">评论池（{article.comments.length}）</h2>
            <p className="mt-1 text-sm text-on-surface-variant">支持嵌套回复和逐条追问。</p>
            {article.comments.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-on-surface-variant">暂时还没有评论，先写下第一条观点吧。</p>
                <div className="mt-4">
                  <Button onClick={() => setParentCommentId('root')}>写评论</Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">{renderComments(article.comments)}</div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-on-surface text-sm font-semibold text-surface">
                {article.author.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{article.author.username}</p>
                <p className="text-sm text-on-surface-variant">
                  {article.article.published_at
                    ? formatDate(article.article.published_at)
                    : formatDate(article.article.created_at)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-surface-container-high px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">浏览量</p>
                <p className="mt-2 text-lg font-semibold text-on-surface">{article.article.view_count}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-high px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">评论数</p>
                <p className="mt-2 text-lg font-semibold text-on-surface">{article.article.comment_count}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {user && user.id === article.author.id ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/blog/${article.article.slug}/edit`)}
                >
                  编辑文章
                </Button>
              ) : null}
              <Button
                className="w-full"
                variant={liked ? 'filled' : 'outline'}
                onClick={handleLike}
              >
                <span className="material-symbols-outlined text-base">{liked ? 'favorite' : 'favorite_border'}</span>
                赞同 {article.article.like_count}
              </Button>
              <Button className="w-full" onClick={() => setParentCommentId('root')}>
                写评论
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
