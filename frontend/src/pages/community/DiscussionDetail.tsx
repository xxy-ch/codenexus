import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { discussionsApi } from '@/services/communityApi'
import type { DiscussionDetail as DiscussionDetailData, DiscussionReply } from '@/types/community'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
import { useDiscussionUpdates } from '@/hooks/useCommunityUpdates'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function DiscussionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [discussion, setDiscussion] = useState<DiscussionDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyContent, setReplyContent] = useState('')
  const [parentReplyId, setParentReplyId] = useState<number | 'root' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likedReplies, setLikedReplies] = useState<Record<number, boolean>>({})

  const { update } = useDiscussionUpdates(id ? parseInt(id, 10) : undefined)

  useEffect(() => {
    if (!id) return

    const fetchDiscussion = async () => {
      setLoading(true)
      try {
        const data = await discussionsApi.getDiscussion(parseInt(id, 10))
        setDiscussion(data)
      } catch (error) {
        console.error('Failed to fetch discussion:', error)
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
  }, [update, discussion])

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
          const addNestedReply = (replies: DiscussionReply[]): DiscussionReply[] =>
            replies.map((r) => {
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
        const nextLikeCount =
          result.like_count >= 0
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
              const nextLikeCount =
                result.like_count >= 0
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('zh-CN')

  const renderReplies = (replies: DiscussionReply[], depth = 0): JSX.Element[] =>
    replies.map((reply) => (
      <div
        key={reply.id}
        className={cn(
          'rounded-2xl border border-outline-variant bg-surface-container-low p-4',
          depth > 0 ? 'ml-6 mt-3' : '',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-surface">
              {reply.author_username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-on-surface">{reply.author_username}</span>
            {reply.is_solution ? (
              <span className="rounded-full border border-tertiary bg-tertiary-container/30 px-2.5 py-1 text-xs font-semibold text-on-tertiary-container">
                题解回复
              </span>
            ) : null}
          </div>
          <span className="text-xs text-on-surface-variant">{formatDate(reply.created_at)}</span>
        </div>

        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-on-surface">{reply.content}</div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setParentReplyId(reply.id)}
            className="text-on-surface-variant transition hover:text-on-surface"
          >
            回复
          </button>
          <button
            type="button"
            onClick={() => handleReplyLike(reply.id)}
            className={cn(
              'transition',
              likedReplies[reply.id] ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            {reply.like_count} 赞同
          </button>
        </div>

        {reply.replies && reply.replies.length > 0 ? renderReplies(reply.replies, depth + 1) : null}
      </div>
    ))

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="加载讨论中..." />
      </div>
    )
  }

  if (!discussion) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="讨论不存在"
          description="当前讨论无法读取。"
          action={{ label: '返回讨论区', onClick: () => navigate('/discussions') }}
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
            社区讨论 / {discussion.discussion.title}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            {discussion.discussion.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            {discussion.problem ? `关联题目：${discussion.problem.title}` : '讨论详情页'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/discussions')}>
          返回讨论区
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Hero Card */}
        <Card variant="default" className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-on-primary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/70">讨论概览</p>
              <h2 className="mt-3 font-headline text-3xl font-extrabold text-on-primary md:text-4xl">讨论诊断台</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/80">
                把帖子状态、关联题目和互动热度压到一屏，阅读、点赞和回复路径保持同一工作台语言。
              </p>
            </div>
            <div className="rounded-2xl border border-on-primary/20 bg-on-primary/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/60">当前热度</p>
              <p className="mt-2 text-3xl font-semibold text-on-primary">{discussion.discussion.view_count}</p>
              <p className="mt-2 text-sm text-on-primary/70">浏览 {discussion.discussion.view_count} 次，回复 {discussion.discussion.reply_count} 条</p>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-2">
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">讨论状态</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">
              {discussion.discussion.is_solved ? '已解决' : discussion.discussion.is_locked ? '已锁定' : '交流中'}
            </p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">关联题目</p>
            <p className="mt-4 text-xl font-extrabold text-on-surface">{discussion.problem?.title ?? '未关联题目'}</p>
          </Card>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {discussion.discussion.is_pinned ? (
          <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-surface">
            置顶
          </span>
        ) : null}
        {discussion.discussion.is_solved ? (
          <span className="rounded-full border border-tertiary bg-tertiary-container/30 px-3 py-1 text-xs font-semibold text-on-tertiary-container">
            已解决
          </span>
        ) : null}
        {discussion.discussion.is_locked ? (
          <span className="rounded-full border border-outline-variant bg-surface-container-high px-3 py-1 text-xs font-semibold text-on-surface-variant">
            已锁定
          </span>
        ) : null}
        {discussion.problem ? (
          <span className="rounded-full border border-primary bg-primary-container/30 px-3 py-1 text-xs font-semibold text-on-primary-container">
            {discussion.problem.title}
          </span>
        ) : null}
        {discussion.discussion.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-outline-variant bg-surface px-3 py-1 text-xs font-semibold text-on-surface"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main Content */}
        <div className="space-y-6">
          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">讨论正文</h2>
            <p className="mt-1 text-sm text-on-surface-variant">保持阅读和回复路径清晰。</p>
            <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-on-surface">
              {discussion.discussion.content}
            </div>
          </Card>

          {parentReplyId !== null ? (
            <Card variant="default" className="p-6">
              <h2 className="font-headline text-xl font-extrabold text-on-surface">
                {typeof parentReplyId === 'number' ? '回复当前评论' : '写回复'}
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">回复会直接落到当前讨论流中。</p>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={4}
                className="mt-5 w-full resize-none rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setParentReplyId(null)
                    setReplyContent('')
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || submitting}
                >
                  {submitting ? '发布中...' : '发布回复'}
                </Button>
              </div>
            </Card>
          ) : null}

          <Card variant="default" className="p-6">
            <h2 className="font-headline text-xl font-extrabold text-on-surface">回复池 ({discussion.replies.length})</h2>
            <p className="mt-1 text-sm text-on-surface-variant">支持嵌套回复和回复点赞。</p>
            {discussion.replies.length === 0 ? (
              <div className="mt-5 py-10 text-center">
                <p className="text-sm text-on-surface-variant">当前还没有回复，直接补上第一条观点。</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">{renderReplies(discussion.replies)}</div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card variant="surface" className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">讨论侧栏</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-on-surface text-sm font-semibold text-surface">
                {discussion.author.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-on-surface">{discussion.author.username}</p>
                <p className="text-sm text-on-surface-variant">发布于 {formatDate(discussion.discussion.created_at)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">浏览量</p>
                <p className="mt-2 text-lg font-semibold text-on-surface">{discussion.discussion.view_count}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">回复数</p>
                <p className="mt-2 text-lg font-semibold text-on-surface">{discussion.discussion.reply_count}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {user && user.id === discussion.author.id ? (
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate(`/discussions/${discussion.discussion.id}/edit`)}
                >
                  编辑讨论
                </Button>
              ) : null}
              <Button fullWidth variant={liked ? 'default' : 'outline'} onClick={handleLike}>
                {discussion.discussion.like_count} 个赞
              </Button>
              {!discussion.discussion.is_locked ? (
                <Button fullWidth onClick={() => setParentReplyId('root')}>
                  写回复
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
