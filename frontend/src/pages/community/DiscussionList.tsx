import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { discussionsApi } from '@/services/discussionsApi'
import type { Discussion, DiscussionFilters } from '@/types/community'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

export function DiscussionList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Get filters from URL params
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
    params.delete('page') // Reset to page 1 when changing filters
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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Discussions</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/discussions/new')}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
              >
                <span className="material-icons text-sm">add</span>
                <span>New Discussion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
            {/* Status Filter */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Status
              </h3>
              <div className="space-y-1">
                <button
                  onClick={() => updateFilter('status', 'all')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    status === 'all'
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-icons text-lg mr-3">forum</span>
                  All Discussions
                </button>
                <button
                  onClick={() => updateFilter('status', 'solved')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    status === 'solved'
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-icons text-lg mr-3">check_circle</span>
                  Solved
                </button>
                <button
                  onClick={() => updateFilter('status', 'unsolved')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    status === 'unsolved'
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="material-icons text-lg mr-3">help</span>
                  Unsolved
                </button>
              </div>
            </div>

            {/* Trending Tags */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Trending Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {['dynamic-programming', 'graphs', 'arrays', 'contest', 'help'].map((t) => (
                  <button
                    key={t}
                    onClick={() => updateFilter('tag', tag === t ? '' : t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      tag === t
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-grow space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {status === 'solved' ? 'Solved' : status === 'unsolved' ? 'Unsolved' : 'All'} Discussions
                {tag && <span className="text-primary ml-2">#{tag}</span>}
              </h2>
              <div className="flex items-center bg-surface-light dark:bg-surface-dark rounded-lg p-1 border border-border-light dark:border-border-dark shadow-sm">
                {(['latest', 'popular', 'unanswered'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateFilter('sort', s)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      sort === s
                        ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                        : 'text-text-muted hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {getSortLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading && page === 1 ? (
              <CardGridSkeleton cards={6} />
            ) : loadError ? (
              <InlineError title="讨论列表加载失败" onRetry={() => fetchDiscussions()} />
            ) : (
              <>
                {/* Discussions List */}
                <div className="space-y-4">
                  {discussions.map((discussion) => (
                    <article
                      key={discussion.id}
                      onClick={() => navigate(`/discussions/${discussion.id}`)}
                      className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer"
                    >
                      <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {discussion.is_pinned && (
                              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold uppercase">
                                Pinned
                              </span>
                            )}
                            {discussion.is_solved && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <span className="material-icons text-[14px]">check_circle</span>
                                Solved
                              </span>
                            )}
                            {discussion.is_locked && (
                              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <span className="material-icons text-[14px]">lock</span>
                                Locked
                              </span>
                            )}
                            {discussion.problem_id && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                {discussion.problem_title || `Problem ${discussion.problem_id}`}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <span className="material-icons text-[14px]">schedule</span>
                            {formatDate(discussion.created_at)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors">
                          {discussion.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-sm text-text-muted mb-4 line-clamp-2">
                          {discussion.content}
                        </p>

                        {/* Tags */}
                        {discussion.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {discussion.tags.map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-semibold text-primary">
                                {discussion.author_username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {discussion.author_username}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-text-muted text-sm">
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">visibility</span>
                              {discussion.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">chat_bubble_outline</span>
                              {discussion.reply_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">thumb_up</span>
                              {discussion.like_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Empty State */}
                {!loading && discussions.length === 0 && (
                  <EmptyState
                    icon={MessageSquare}
                    title="暂无讨论"
                    description="还没有人发起讨论，来发表第一个吧"
                    action={
                      <button
                        onClick={() => navigate('/discussions/new')}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium"
                      >
                        <span className="material-icons">add</span>
                        Create Discussion
                      </button>
                    }
                  />
                )}

                {/* Pagination */}
                {discussions.length > 0 && (
                  <div className="flex justify-center gap-2 pt-8">
                    <button
                      onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                      disabled={page === 1}
                      className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium text-text-muted hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-sm font-medium text-text-muted">
                      Page {page}
                    </span>
                    <button
                      onClick={() => updateFilter('page', (page + 1).toString())}
                      disabled={!hasMore}
                      className="px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium text-text-muted hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
