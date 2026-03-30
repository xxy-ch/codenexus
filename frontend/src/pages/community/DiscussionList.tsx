import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { discussionsService } from '@/services/discussions'
import { cn } from '@/lib/utils'

const categoryOptions = [
  { value: 'all', label: 'All' },
  { value: 'solution', label: 'Solutions' },
  { value: 'question', label: 'Questions' },
  { value: 'general', label: 'General' },
  { value: 'bug_report', label: 'Bug Reports' },
]

function categoryTone(category: string) {
  if (category === 'solution') return 'bg-tertiary-container text-on-tertiary-fixed-variant'
  if (category === 'bug_report') return 'bg-error-container text-on-error-container'
  if (category === 'question') return 'bg-secondary-container text-on-secondary-container'
  return 'bg-surface-container-low text-on-surface-variant'
}

function categoryLabel(category: string) {
  if (category === 'question') return 'Question'
  if (category === 'solution') return 'Solution'
  if (category === 'bug_report') return 'Bug Report'
  if (category === 'general') return 'General'
  return category
}

export function DiscussionList() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState<'recent' | 'popular' | 'most_liked'>('recent')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discussions', category, search, sort],
    queryFn: () =>
      discussionsService.getDiscussions({
        category: category || undefined,
        search: search || undefined,
        sort,
        page: 1,
        limit: 20,
      }),
  })

  const discussions = data?.discussions ?? []

  const stats = useMemo(() => {
    return {
      total: data?.total ?? discussions.length,
      solved: discussions.filter((item) => item.category === 'solution').length,
      unanswered: discussions.filter((item) => item.reply_count === 0).length,
    }
  }, [data?.total, discussions])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading discussions..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load discussions"
          message="Unable to fetch discussions. Please try again later."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div>
              <p className="font-headline text-lg font-extrabold text-primary">Community</p>
              <p className="mt-1 text-xs font-medium text-on-surface-variant">Knowledge Exchange</p>
            </div>
            <Link
              to="/discussions/new"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Post
            </Link>
            <nav className="mt-4 space-y-1 text-sm font-medium">
              {[
                ['All Posts', ''],
                ['Solutions', 'solution'],
                ['Questions', 'question'],
                ['Bug Reports', 'bug_report'],
              ].map(([label, value]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                    category === value ? 'bg-primary-container text-primary' : 'text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  <span>{label}</span>
                  {value === '' ? <span className="text-xs font-bold">{stats.total}</span> : null}
                </button>
              ))}
            </nav>
          </Card>

          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Overview
            </p>
            <div className="mt-4 space-y-3 text-sm text-on-surface">
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <span>Total Topics</span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <span>Solutions</span>
                <span className="font-semibold">{stats.solved}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <span>Unanswered</span>
                <span className="font-semibold">{stats.unanswered}</span>
              </div>
            </div>
          </Card>
        </aside>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Community
              </p>
              <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
                Knowledge Exchange
              </h1>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                Join the discussion on algorithms, data structures, and problem-solving strategies.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-surface-container-low p-1">
              {[
                ['recent', 'Latest'],
                ['popular', 'Trending'],
                ['most_liked', 'Unsolved'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSort(value as 'recent' | 'popular' | 'most_liked')}
                  className={cn(
                    'rounded-lg px-4 py-2 text-xs font-semibold transition-colors',
                    sort === value
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-white/80',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Input
                  type="search"
                  aria-label="Search discussions"
                  placeholder="Search by title or content..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {categoryOptions.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value === 'all' ? '' : item.value)}
                    className={cn(
                      'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-colors',
                      (item.value === 'all' && !category) || category === item.value
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Discussion List */}
          <div className="space-y-3">
            {discussions.length === 0 ? (
              <EmptyState
                title="No discussions found"
                description="Try adjusting your filters or be the first to start a discussion."
                icon={
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                    forum
                  </span>
                }
                action={
                  search || category
                    ? { label: 'Clear Filters', onClick: () => { setSearch(''); setCategory('') } }
                    : undefined
                }
              />
            ) : (
              discussions.map((discussion) => (
                <Link key={discussion.id} to={`/discussions/${discussion.id}`}>
                  <Card className="p-5 transition-colors hover:bg-surface-container-low/50">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-sm font-bold text-primary">
                          {discussion.author_username.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', categoryTone(discussion.category))}>
                              {categoryLabel(discussion.category)}
                            </span>
                            {discussion.is_pinned ? (
                              <span className="rounded-full bg-tertiary-container px-2.5 py-1 text-xs font-semibold text-on-tertiary-fixed-variant">
                                Pinned
                              </span>
                            ) : null}
                            {discussion.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h2 className="mt-3 text-base font-semibold text-on-surface transition-colors hover:text-primary">
                            {discussion.title}
                          </h2>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">
                            {discussion.content}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-on-surface-variant">
                            <span>by {discussion.author_username}</span>
                            <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                            {discussion.problem_title ? <span>Related: {discussion.problem_title}</span> : null}
                            {discussion.is_locked ? <span>Locked</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="grid min-w-[180px] grid-cols-3 gap-6 px-2 text-center lg:grid-cols-1 lg:text-right">
                        <div>
                          <p className="font-headline text-lg font-extrabold text-on-surface">{discussion.reply_count}</p>
                          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">Replies</p>
                        </div>
                        <div>
                          <p className="font-headline text-lg font-extrabold text-on-surface">{discussion.view_count}</p>
                          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">Views</p>
                        </div>
                        <div>
                          <p className="font-headline text-lg font-extrabold text-on-surface">{discussion.like_count}</p>
                          <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">Likes</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DiscussionList
