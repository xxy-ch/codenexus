import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { blogApi } from '@/services/communityApi'
import { cn } from '@/lib/utils'
import type { ArticleFilters } from '@/types/community'

export function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState<any[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [popularTags, setPopularTags] = useState<Array<{ tag: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isError, setIsError] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined
  const sort = searchParams.get('sort') || undefined

  const fetchArticles = async () => {
    setLoading(true)
    setIsError(false)

    try {
      if (sort === 'trending') {
        const trending = await blogApi.getTrendingArticles(12)
        setArticles(trending)
        setHasMore(false)
      } else if (sort === 'featured') {
        const featuredOnly = await blogApi.getFeaturedArticles(12)
        setArticles(featuredOnly)
        setHasMore(false)
      } else {
        const filters: ArticleFilters = {
          page,
          limit: 12,
          category,
          tag,
          sort: sort as ArticleFilters['sort'],
        }
        const response = await blogApi.getArticles(filters)
        setArticles(response.articles)
        setHasMore(response.has_more ?? page < Math.ceil(response.total / Math.max(1, response.limit)))
      }

      if (page === 1 && !category && !tag && !sort) {
        const [featured, fetchedCategories, fetchedTags] = await Promise.all([
          blogApi.getFeaturedArticles(3),
          blogApi.getCategories(),
          blogApi.getPopularTags(10),
        ])
        setFeaturedArticles(featured)
        setCategories(fetchedCategories)
        setPopularTags(fetchedTags)
      }
    } catch (fetchError) {
      console.error('Failed to fetch articles:', fetchError)
      setIsError(true)
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and when filters change
  useState(() => {
    void fetchArticles()
  })

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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const activeTitle = category || (sort === 'trending' ? 'Trending' : sort === 'featured' ? 'Featured' : 'Recent')
  const featuredLead = featuredArticles[0]
  const visibleTagCount = useMemo(() => popularTags.slice(0, 8), [popularTags])

  if (loading && page === 1) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        <LoadingState message="Loading articles..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <ErrorState
          title="Failed to load articles"
          message="Unable to fetch blog articles. Please try again later."
          action={{ label: 'Retry', onClick: () => fetchArticles() }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-fixed">
                <span className="material-symbols-outlined text-lg">forum</span>
              </div>
              <div>
                <p className="font-headline text-base font-extrabold text-on-surface">Community Blog</p>
                <p className="text-xs text-on-surface-variant">Knowledge Exchange</p>
              </div>
            </div>
            <Link
              to="/blog/new"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:shadow-lg"
            >
              <span className="material-symbols-outlined text-base">edit_square</span>
              Write Article
            </Link>
            <nav className="mt-4 space-y-1 text-sm font-medium">
              {[
                ['All Posts', ''],
                ['Trending', 'trending'],
                ['Featured', 'featured'],
              ].map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => {
                    if (value) {
                      updateFilter('sort', value)
                    } else {
                      updateFilter('sort', '')
                      updateFilter('category', '')
                      updateFilter('tag', '')
                    }
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                    value ? sort === value : !category && !tag && !sort
                      ? 'bg-primary-container text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  <span>{label}</span>
                  {label === 'All Posts' ? <span className="text-xs font-bold">{articles.length}</span> : null}
                </button>
              ))}
            </nav>
          </Card>

          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Current Filters
            </p>
            <div className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="font-medium text-on-surface">Sort</p>
                <p className="mt-1 text-on-surface-variant">{sort || 'recent'}</p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="font-medium text-on-surface">Category</p>
                <p className="mt-1 text-on-surface-variant">{category || 'all'}</p>
              </div>
              <div className="rounded-lg bg-white px-4 py-3">
                <p className="font-medium text-on-surface">Tag</p>
                <p className="mt-1 text-on-surface-variant">{tag || 'none'}</p>
              </div>
            </div>
            {(category || tag || sort) ? (
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  updateFilter('category', '')
                  updateFilter('tag', '')
                  updateFilter('sort', '')
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </Card>
        </aside>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Featured Article */}
          {page === 1 && !category && !tag && !sort && featuredLead ? (
            <section className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full bg-tertiary-container px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-tertiary-fixed-variant">
                  Featured Editorial
                </span>
                <h1 className="mt-4 font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
                  {featuredLead.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-on-surface-variant">
                  {featuredLead.excerpt}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container-low text-sm font-bold text-primary">
                    {featuredLead.author_username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{featuredLead.author_username}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDate(featuredLead.created_at)} · {featuredLead.comment_count} comments
                    </p>
                  </div>
                  <Link
                    to={`/blog/${featuredLead.slug}`}
                    className="ml-auto inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors lg:ml-6 hover:gap-3"
                  >
                    Read Full Article
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <Link
                  to={`/blog/${featuredLead.slug}`}
                  className="block overflow-hidden rounded-xl bg-gradient-to-br from-primary-container to-surface-container-low p-8 shadow-md"
                >
                  <div className="flex h-[320px] items-end rounded-lg bg-gradient-to-t from-primary/20 to-transparent p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {featuredLead.category || 'Editorial'}
                      </p>
                      <p className="mt-2 text-base font-semibold text-on-surface">
                        {featuredLead.tags.slice(0, 2).join(' · ') || 'Algorithm专题'}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          ) : null}

          {/* Article List Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface">Recent Publications</h2>
            <div className="flex gap-4">
              {[
                { label: 'Latest', value: '' },
                { label: 'Trending', value: 'trending' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => updateFilter('sort', item.value)}
                  className={cn(
                    'text-sm transition-colors',
                    item.value ? sort === item.value : !category && !tag && !sort
                      ? 'font-semibold text-primary'
                      : 'font-medium text-on-surface-variant hover:text-primary'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((item) => (
                  <button
                    key={item}
                    onClick={() => updateFilter('category', category === item ? '' : item)}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      category === item
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleTagCount.map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => updateFilter('tag', tag === item.tag ? '' : item.tag)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                      tag === item.tag
                        ? 'bg-on-surface text-white'
                        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    )}
                  >
                    #{item.tag}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Articles Grid */}
          <section>
            {articles.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => {
                      // navigate to article detail
                      window.location.href = `/blog/${article.slug}`
                    }}
                    className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white p-0 shadow-sm transition hover:bg-surface-container-low/30"
                  >
                    <div className="flex min-h-[168px] items-end bg-gradient-to-br from-surface-container-low to-surface-container-low/50 p-5">
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {article.is_featured ? (
                            <span className="rounded-full bg-tertiary-container px-2.5 py-1 text-xs font-medium text-on-tertiary-fixed-variant">
                              Featured
                            </span>
                          ) : null}
                          {article.category ? (
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                              {article.category}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-on-surface-variant">{formatDate(article.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-semibold leading-tight text-on-surface transition-colors group-hover:text-primary">
                        {article.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-6 text-on-surface-variant">{article.excerpt}</p>
                      {article.tags.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {article.tags.slice(0, 3).map((item: string) => (
                            <span key={item} className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                              #{item}
                            </span>
                          ))}
                          {article.tags.length > 3 ? (
                            <span className="text-xs text-on-surface-variant">+{article.tags.length - 3}</span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-6 flex items-center justify-between border-t border-outline-variant/10 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-on-surface text-xs font-semibold text-white">
                            {article.author_username.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-on-surface-variant">{article.author_username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                          <span>{article.view_count} views</span>
                          <span>{article.like_count} likes</span>
                          <span>{article.comment_count} comments</span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No articles found"
                description={category || tag ? 'Try adjusting your filters.' : 'Be the first to write an article.'}
                icon={
                  <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                    article
                  </span>
                }
                action={
                  category || tag
                    ? { label: 'Clear Filters', onClick: () => { updateFilter('category', ''); updateFilter('tag', '') } }
                    : undefined
                }
              />
            )}

            {/* Pagination */}
            {articles.length > 0 && !sort ? (
              <div className="mt-5 flex items-center justify-between border-t border-outline-variant/10 pt-5 text-sm">
                <span className="text-on-surface-variant">Page {page}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateFilter('page', (page + 1).toString())}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

export default BlogList
