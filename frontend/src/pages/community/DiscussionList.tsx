import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { discussionsApi } from '@/services/communityApi'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { Discussion, DiscussionFilters } from '@/types/community'

const DEFAULT_TAGS = ['dynamic-programming', 'graphs', 'arrays', 'contest', 'help']

export function DiscussionList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const sort = (searchParams.get('sort') as DiscussionFilters['sort']) || 'latest'
  const status = (searchParams.get('status') as DiscussionFilters['status']) || 'all'
  const tag = searchParams.get('tag') || undefined
  const problemId = searchParams.get('problem_id') ? parseInt(searchParams.get('problem_id')!, 10) : undefined

  useEffect(() => {
    const fetchDiscussions = async () => {
      setLoading(true)

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
      } catch (fetchError) {
        console.error('Failed to fetch discussions:', fetchError)
      } finally {
        setLoading(false)
      }
    }

    void fetchDiscussions()
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

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getSortLabel = (sortValue: string) => {
    switch (sortValue) {
      case 'latest':
        return 'Newest'
      case 'popular':
        return 'Top Rated'
      case 'unanswered':
        return 'Unanswered'
      default:
        return 'Newest'
    }
  }

  const suggestedTags = useMemo(() => {
    return Array.from(new Set([...DEFAULT_TAGS, ...discussions.flatMap((discussion) => discussion.tags)])).slice(0, 8)
  }, [discussions])

  const solvedCount = discussions.filter((discussion) => discussion.is_solved).length
  const pinnedCount = discussions.filter((discussion) => discussion.is_pinned).length
  const linkedProblems = discussions.filter((discussion) => discussion.problem_id).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community Discussions"
        title="Discussions"
        description="讨论区保留真实筛选、排序和分页行为，布局统一为筛选条 + 主题列表 + 侧向摘要。"
        actions={
          <Button onClick={() => navigate('/discussions/new')} variant="primary">
            <span className="material-symbols-outlined text-base">add</span>
            New Discussion
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="当前页主题" value={`${discussions.length} 条`} helper={status === 'all' ? '全部状态' : status} />
        <StatCard label="已解决" value={`${solvedCount} 条`} helper="当前页已标记已解决" />
        <StatCard label="题目关联" value={`${linkedProblems} 条`} helper={`${pinnedCount} 条置顶`} />
      </div>

      <FilterBar className="items-start">
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Status</span>
          <div className="flex flex-wrap gap-2">
            {(['all', 'solved', 'unsolved'] as const).map((value) => (
              <button
                key={value}
                onClick={() => updateFilter('status', value === 'all' ? 'all' : value)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  status === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {value === 'all' ? 'All Discussions' : value === 'solved' ? 'Solved' : 'Unsolved'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Sort</span>
          <div className="flex flex-wrap gap-2">
            {(['latest', 'popular', 'unanswered'] as const).map((value) => (
              <button
                key={value}
                onClick={() => updateFilter('sort', value)}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  sort === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {getSortLabel(value)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Trending Tags</span>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((item) => (
              <button
                key={item}
                onClick={() => updateFilter('tag', tag === item ? '' : item)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  tag === item ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                #{item}
              </button>
            ))}
          </div>
        </div>
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {loading && page === 1 ? (
            <Loading message="Loading discussions..." />
          ) : (
            <SectionBlock
              title={`${status === 'solved' ? 'Solved' : status === 'unsolved' ? 'Unsolved' : 'All'} Discussions`}
              description={tag ? `当前标签：#${tag}` : '按当前状态和排序展示真实讨论主题。'}
            >
              {discussions.length > 0 ? (
                <div className="space-y-4">
                  {discussions.map((discussion) => (
                    <article
                      key={discussion.id}
                      onClick={() => navigate(`/discussions/${discussion.id}`)}
                      className="group cursor-pointer rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {discussion.is_pinned ? (
                            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-medium text-white">Pinned</span>
                          ) : null}
                          {discussion.is_solved ? (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Solved</span>
                          ) : null}
                          {discussion.is_locked ? (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">Locked</span>
                          ) : null}
                          {discussion.problem_id ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              {discussion.problem_title || `Problem ${discussion.problem_id}`}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-slate-500">{formatDate(discussion.created_at)}</span>
                      </div>

                      <h3 className="mt-4 text-xl font-semibold leading-tight text-slate-950">{discussion.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{discussion.content}</p>

                      {discussion.tags.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {discussion.tags.map((item) => (
                            <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                              #{item}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                            {discussion.author_username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-700">{discussion.author_username}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>{discussion.view_count}</span>
                          <span>{discussion.reply_count}</span>
                          <span>{discussion.like_count}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No discussions found"
                  description="Be the first to start a discussion."
                  action={
                    <Button onClick={() => navigate('/discussions/new')} variant="primary">
                      Create Discussion
                    </Button>
                  }
                  className="border-slate-200 bg-slate-50 py-12"
                />
              )}

              {discussions.length > 0 ? (
                <div className="mt-5 flex justify-center gap-2 border-t border-slate-200 pt-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('page', (page + 1).toString())}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </SectionBlock>
          )}
        </div>

        <div className="space-y-4">
          <SurfaceCard tone="muted">
            <h2 className="text-lg font-semibold text-slate-950">当前筛选</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Status</p>
                <p className="mt-1">{status}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Sort</p>
                <p className="mt-1">{sort}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Tag</p>
                <p className="mt-1">{tag || 'none'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Problem</p>
                <p className="mt-1">{problemId ?? 'all'}</p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}
