import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionBlock } from '@/components/page/SectionBlock'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'
import type { Article, ArticleFilters, PopularTag } from '@/types/community'

export function BlogList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState<Article[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [popularTags, setPopularTags] = useState<PopularTag[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined
  const sort = searchParams.get('sort') || undefined

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true)

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
      } finally {
        setLoading(false)
      }
    }

    void fetchArticles()
  }, [page, category, tag, sort])

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

  const activeTitle = category || (sort ? `${sort[0].toUpperCase()}${sort.slice(1)} Posts` : 'All Posts')
  const featuredLead = featuredArticles[0]
  const visibleTagCount = useMemo(() => popularTags.slice(0, 8), [popularTags])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Community Blog"
        title="Blog"
        description="聚合教程、题解和公告内容。页面保留真实文章、精选流和分类标签，但布局统一收敛为浏览列表。"
        actions={
          <Button onClick={() => navigate('/blog/new')} variant="primary">
            <span className="material-symbols-outlined text-base">edit_square</span>
            Write Article
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="当前文章" value={`${articles.length} 篇`} helper={activeTitle} />
        <StatCard label="精选文章" value={`${featuredArticles.length} 篇`} helper="首页精选流" />
        <StatCard label="分类" value={`${categories.length} 个`} helper="已开放分类数" />
        <StatCard label="热门标签" value={`${popularTags.length} 个`} helper="按当前热门排序" />
      </div>

      <FilterBar className="items-start">
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">Feeds</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All Posts', value: '' },
              { label: 'Trending', value: 'trending' },
              { label: 'Featured', value: 'featured' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => (item.value ? navigate(`/blog?sort=${item.value}`) : navigate('/blog'))}
                className={cn(
                  'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  item.value ? sort === item.value : !category && !tag && !sort
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {categories.length > 0 ? (
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Categories</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => updateFilter('category', category === item ? '' : item)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    category === item ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {visibleTagCount.length > 0 ? (
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">Trending Tags</span>
            <div className="flex flex-wrap gap-2">
              {visibleTagCount.map((item) => (
                <button
                  key={item.tag}
                  onClick={() => updateFilter('tag', tag === item.tag ? '' : item.tag)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                    tag === item.tag ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  #{item.tag}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </FilterBar>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          {loading && page === 1 ? (
            <Loading message="Loading articles..." />
          ) : (
            <>
              {page === 1 && !category && !tag && !sort && featuredLead ? (
                <SurfaceCard>
                  <div
                    onClick={() => navigate(`/blog/${featuredLead.slug}`)}
                    className="cursor-pointer rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Featured
                      </span>
                      {featuredLead.category ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          {featuredLead.category}
                        </span>
                      ) : null}
                      <span className="text-xs text-slate-500">{formatDate(featuredLead.created_at)}</span>
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{featuredLead.title}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{featuredLead.excerpt}</p>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                          {featuredLead.author_username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{featuredLead.author_username}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{featuredLead.view_count} views</span>
                        <span>{featuredLead.like_count} likes</span>
                        <span>{featuredLead.comment_count} comments</span>
                      </div>
                    </div>
                  </div>
                </SurfaceCard>
              ) : null}

              <SectionBlock
                title={activeTitle}
                description={tag ? `当前标签：#${tag}` : '当前流展示真实博客内容和已落地过滤条件。'}
              >
                {articles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {articles.map((article) => (
                      <article
                        key={article.id}
                        onClick={() => navigate(`/blog/${article.slug}`)}
                        className="group flex h-full cursor-pointer flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {article.is_featured ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                                Featured
                              </span>
                            ) : null}
                            {article.category ? (
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                {article.category}
                              </span>
                            ) : null}
                          </div>
                          <span className="text-xs text-slate-500">{formatDate(article.created_at)}</span>
                        </div>
                        <h3 className="mt-4 text-xl font-semibold leading-tight text-slate-950">{article.title}</h3>
                        <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{article.excerpt}</p>
                        {article.tags.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {article.tags.slice(0, 3).map((item) => (
                              <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                #{item}
                              </span>
                            ))}
                            {article.tags.length > 3 ? (
                              <span className="text-xs text-slate-500">+{article.tags.length - 3}</span>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                              {article.author_username.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-700">{article.author_username}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>{article.view_count}</span>
                            <span>{article.like_count}</span>
                            <span>{article.comment_count}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No articles found"
                    description={category || tag ? 'Try adjusting your filters.' : 'Be the first to write an article.'}
                    action={
                      !category && !tag ? (
                        <Button onClick={() => navigate('/blog/new')} variant="primary">
                          Write Article
                        </Button>
                      ) : undefined
                    }
                    className="border-slate-200 bg-slate-50 py-12"
                  />
                )}

                {articles.length > 0 && !sort ? (
                  <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-5 text-sm">
                    <span className="text-slate-500">Page {page}</span>
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
              </SectionBlock>
            </>
          )}
        </div>

        <div className="space-y-4">
          <SurfaceCard tone="muted">
            <h2 className="text-lg font-semibold text-slate-950">当前筛选</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Sort</p>
                <p className="mt-1">{sort || 'recent'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Category</p>
                <p className="mt-1">{category || 'all'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="font-medium text-slate-900">Tag</p>
                <p className="mt-1">{tag || 'none'}</p>
              </div>
            </div>
          </SurfaceCard>

          {(category || tag || sort) ? (
            <SurfaceCard>
              <h2 className="text-lg font-semibold text-slate-950">重置过滤</h2>
              <p className="mt-3 text-sm text-slate-600">当前处于过滤视图，返回主流可以继续浏览完整文章列表。</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate('/blog')}>
                  Clear filters
                </Button>
              </div>
            </SurfaceCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
