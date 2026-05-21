import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare, Plus, Eye, MessageCircle, ThumbsUp, Pin, CheckCircle, Lock, BookOpen, Clock } from 'lucide-react'
import { discussionsApi } from '@/services/discussionsApi'
import type { Discussion, DiscussionFilters } from '@/types/community'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'

export function DiscussionList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const sort = (searchParams.get('sort') as DiscussionFilters['sort']) || 'latest'
  const status = (searchParams.get('status') as DiscussionFilters['status']) || 'all'
  const tag = searchParams.get('tag') || undefined
  const problemId = searchParams.get('problem_id')
    ? parseInt(searchParams.get('problem_id')!)
    : undefined

  const fetchDiscussions = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const filters: DiscussionFilters = {
        page,
        limit: 20,
        sort,
        status,
        tag,
        problem_id: problemId,
      }
      const response = await discussionsApi.getDiscussions(filters)
      setDiscussions(response.discussions)
      setHasMore(response.has_more)
    } catch (error) {
      console.error('Failed to fetch discussions:', error)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDiscussions()
  }, [page, sort, status, tag, problemId])

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')
    setSearchParams(params)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case 'latest': return '最新'
      case 'popular': return '热门'
      case 'unanswered': return '未回答'
      default: return '最新'
    }
  }

  const statusLabel = status === 'solved' ? '已解决' : status === 'unsolved' ? '未解决' : '全部'

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                <MessageSquare className="h-3.5 w-3.5" />
                CodeNexus 讨论
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">讨论区</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  提问、分享解题思路、交流算法心得。支持实时 WebSocket 更新和标签过滤。
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/discussions/new')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              发起讨论
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
              状态筛选
            </h3>
            <div className="space-y-2">
              {[
                { label: '全部讨论', value: 'all' },
                { label: '已解决', value: 'solved' },
                { label: '未解决', value: 'unsolved' },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => updateFilter('status', item.value)}
                  className={cn(
                    'w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition',
                    status === item.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-background'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
              热门标签
            </h3>
            <div className="flex flex-wrap gap-2">
              {['dynamic-programming', 'graphs', 'arrays', 'contest', 'help'].map((t) => (
                <button
                  key={t}
                  onClick={() => updateFilter('tag', tag === t ? '' : t)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition',
                    tag === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-grow space-y-8">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">
              {statusLabel}讨论
              {tag && <span className="ml-2 text-primary">#{tag}</span>}
            </h2>
            <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
              {(['latest', 'popular', 'unanswered'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateFilter('sort', s)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition',
                    sort === s
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {getSortLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {loading && page === 1 ? (
            <CardGridSkeleton cards={6} />
          ) : loadError ? (
            <InlineError title="讨论列表加载失败" onRetry={() => fetchDiscussions()} />
          ) : (
            <>
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <article
                    key={discussion.id}
                    onClick={() => navigate(`/discussions/${discussion.id}`)}
                    className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden transition hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_7px] group cursor-pointer"
                  >
                    <div className="p-6">
                      {/* Badges */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {discussion.is_pinned && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              <Pin className="h-3 w-3" />
                              置顶
                            </span>
                          )}
                          {discussion.is_solved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
                              <CheckCircle className="h-3 w-3" />
                              已解决
                            </span>
                          )}
                          {discussion.is_locked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted-foreground/10 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              <Lock className="h-3 w-3" />
                              已锁定
                            </span>
                          )}
                          {discussion.problem_id && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                              {discussion.problem_title || `题目 ${discussion.problem_id}`}
                            </span>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(discussion.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition">
                        {discussion.title}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {discussion.content}
                      </p>

                      {/* Tags */}
                      {discussion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {discussion.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {discussion.author_username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            {discussion.author_username}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {discussion.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {discussion.reply_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {discussion.like_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!loading && discussions.length === 0 && (
                <EmptyState
                  icon={MessageSquare}
                  title="暂无讨论"
                  description="还没有人发起讨论，来发表第一个吧"
                  action={
                    <button
                      onClick={() => navigate('/discussions/new')}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
                    >
                      <Plus className="h-4 w-4" />
                      发起讨论
                    </button>
                  }
                />
              )}

              {discussions.length > 0 && (
                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                    disabled={page === 1}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-background transition"
                  >
                    上一页
                  </button>
                  <span className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    第 {page} 页
                  </span>
                  <button
                    onClick={() => updateFilter('page', (page + 1).toString())}
                    disabled={!hasMore}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground disabled:opacity-50 hover:bg-background transition"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
