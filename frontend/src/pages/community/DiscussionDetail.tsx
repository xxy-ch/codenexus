import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { discussionsApi } from '@/services/communityApi'
import type { DiscussionDetail as DiscussionDetailData, DiscussionReply } from '@/types/community'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'
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
          'rounded-2xl border border-slate-200 bg-slate-50/80 p-4',
          depth > 0 ? 'ml-6 mt-3' : '',
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {reply.author_username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-950">{reply.author_username}</span>
            {reply.is_solution ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                题解回复
              </span>
            ) : null}
          </div>
          <span className="text-xs text-slate-400">{formatDate(reply.created_at)}</span>
        </div>

        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.content}</div>

        <div className="mt-3 flex items-center gap-4 text-sm">
          <button
            type="button"
            onClick={() => setParentReplyId(reply.id)}
            className="text-slate-500 transition hover:text-slate-900"
          >
            回复
          </button>
          <button
            type="button"
            onClick={() => handleReplyLike(reply.id)}
            className={cn(
              'transition',
              likedReplies[reply.id] ? 'text-slate-950' : 'text-slate-500 hover:text-slate-900',
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载讨论中..." />
      </div>
    )
  }

  if (!discussion) {
    return (
      <EmptyState
        title="讨论不存在"
        description="当前讨论无法读取。"
        action={
          <Button variant="primary" onClick={() => navigate('/discussions')}>
            返回讨论区
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="讨论诊断台"
        breadcrumb={['社区讨论', discussion.discussion.title]}
        title={discussion.discussion.title}
        description={discussion.problem ? `关联题目：${discussion.problem.title}` : '讨论详情页'}
        actions={
          <Button variant="outline" onClick={() => navigate('/discussions')}>
            返回讨论区
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <SurfaceCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(7,43,117,0.98)_0%,rgba(13,82,186,0.96)_54%,rgba(140,198,255,0.9)_100%)] px-6 py-6 text-white shadow-[0_22px_48px_rgba(8,50,132,0.22)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">讨论概览</p>
              <h2 className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-white md:text-[2.5rem]">讨论诊断台</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                把帖子状态、关联题目和互动热度压到一屏，阅读、点赞和回复路径保持同一工作台语言。
              </p>
            </div>
            <div className="rounded-[28px] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">当前热度</p>
              <p className="mt-2 text-3xl font-semibold text-white">{discussion.discussion.view_count}</p>
              <p className="mt-2 text-sm text-white/74">浏览 {discussion.discussion.view_count} 次，回复 {discussion.discussion.reply_count} 条</p>
            </div>
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
          <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.94)_100%)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">讨论状态</p>
            <p className="mt-3 text-3xl font-semibold text-[#131b2e]">
              {discussion.discussion.is_solved ? '已解决' : discussion.discussion.is_locked ? '已锁定' : '交流中'}
            </p>
          </SurfaceCard>
          <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.94)_100%)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">关联题目</p>
            <p className="mt-3 text-xl font-semibold text-[#131b2e]">{discussion.problem?.title ?? '未关联题目'}</p>
          </SurfaceCard>
        </div>
      </div>

      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {discussion.discussion.is_pinned ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
            置顶
          </span>
        ) : null}
        {discussion.discussion.is_solved ? (
          <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            已解决
          </span>
        ) : null}
        {discussion.discussion.is_locked ? (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            已锁定
          </span>
        ) : null}
        {discussion.problem ? (
          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {discussion.problem.title}
          </span>
        ) : null}
        {discussion.discussion.tags.map((tag) => (
          <span
            key={tag}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SectionBlock title="讨论正文" description="保持阅读和回复路径清晰。">
            <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
              {discussion.discussion.content}
            </div>
          </SectionBlock>

          {parentReplyId !== null ? (
            <SectionBlock
              title={typeof parentReplyId === 'number' ? '回复当前评论' : '写回复'}
              description="回复会直接落到当前讨论流中。"
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
                  variant="primary"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || submitting}
                >
                  {submitting ? '发布中...' : '发布回复'}
                </Button>
              </div>
            </SectionBlock>
          ) : null}

          <SectionBlock title={`回复池 (${discussion.replies.length})`} description="支持嵌套回复和回复点赞。">
            {discussion.replies.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">当前还没有回复，直接补上第一条观点。</p>
              </div>
            ) : (
              <div className="space-y-3">{renderReplies(discussion.replies)}</div>
            )}
          </SectionBlock>
        </div>

        <div className="space-y-6">
          <SurfaceCard className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">讨论侧栏</p>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {discussion.author.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-slate-950">{discussion.author.username}</p>
                <p className="text-sm text-slate-500">发布于 {formatDate(discussion.discussion.created_at)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">浏览量</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{discussion.discussion.view_count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">回复数</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{discussion.discussion.reply_count}</p>
              </div>
            </div>
            <div className="space-y-3">
              {user && user.id === discussion.author.id ? (
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate(`/discussions/${discussion.discussion.id}/edit`)}
                >
                  编辑讨论
                </Button>
              ) : null}
              <Button fullWidth variant={liked ? 'primary' : 'outline'} onClick={handleLike}>
                {discussion.discussion.like_count} 个赞
              </Button>
              {!discussion.discussion.is_locked ? (
                <Button fullWidth variant="primary" onClick={() => setParentReplyId('root')}>
                  写回复
                </Button>
              ) : null}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
