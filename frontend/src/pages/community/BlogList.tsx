import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Bookmark, Flame, FolderKanban, PenSquare, Search, Sparkles, Star } from 'lucide-react'
import { blogApi } from '@/services/articlesApi'
import type { Article, ArticleFilters, PopularTag } from '@/types/community'
import { Loading } from '@/components/ui/Loading'
import { cn } from '@/lib/utils'

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
        const [featured, cats, tags] = await Promise.all([
          blogApi.getFeaturedArticles(3),
          blogApi.getCategories(),
          blogApi.getPopularTags(10),
        ])
        setFeaturedArticles(featured)
        setCategories(cats)
        setPopularTags(tags)
      }
    } catch (error) {
      console.error('Failed to fetch articles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_32%),linear-gradient(135deg,#fff7ed_0%,#fefce8_42%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Community Blog Feed
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Blog</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  聚合教程、题解和公告内容。页面已接入真实文章数据、精选流和分类标签，不再是静态占位信息流。
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/blog/new')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
              >
                <PenSquare className="h-4 w-4" />
                Write Article
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Feeds</p>
            <div className="mt-4 space-y-2">
              {[
                { label: 'All Posts', icon: Bookmark, value: '' },
                { label: 'Trending', icon: Flame, value: 'trending' },
                { label: 'Featured', icon: Star, value: 'featured' },
              ].map((item) => {
                const active = item.value ? sort === item.value : !category && !tag && !sort
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => (item.value ? navigate(`/blog?sort=${item.value}`) : navigate('/blog'))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                      active
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Categories</p>
              </div>
              <div className="mt-4 space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateFilter('category', category === cat ? '' : cat)}
                    className={cn(
                      'w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition',
                      category === cat
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {popularTags.length > 0 && (
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Trending Tags</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => updateFilter('tag', tag === item.tag ? '' : item.tag)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      tag === item.tag
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    #{item.tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
                {activeTitle}
                {tag && <span className="ml-2 text-orange-500">#{tag}</span>}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                当前流展示真实博客内容和已落地过滤条件。
              </p>
            </div>
            {(category || tag || sort) && (
              <button
                onClick={() => navigate('/blog')}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading && page === 1 ? (
            <Loading message="Loading articles..." />
          ) : (
            <>
              {page === 1 && !category && !tag && !sort && featuredArticles.length > 0 && (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <div className="mb-4 flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Featured Articles</h3>
                  </div>
                  <div
                    onClick={() => navigate(`/blog/${featuredArticles[0].slug}`)}
                    className="cursor-pointer rounded-[24px] bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 transition hover:shadow-md dark:from-slate-900 dark:via-slate-950 dark:to-slate-900"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                        Featured
                      </span>
                      {featuredArticles[0].category && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {featuredArticles[0].category}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{formatDate(featuredArticles[0].created_at)}</span>
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                      {featuredArticles[0].title}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{featuredArticles[0].excerpt}</p>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                          {featuredArticles[0].author_username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{featuredArticles[0].author_username}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span>{featuredArticles[0].view_count} views</span>
                        <span>{featuredArticles[0].like_count} likes</span>
                        <span>{featuredArticles[0].comment_count} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {articles.map((article) => (
                  <article
                    key={article.id}
                    onClick={() => navigate(`/blog/${article.slug}`)}
                    className="group flex h-full cursor-pointer flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {article.is_featured && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            Featured
                          </span>
                        )}
                        {article.category && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {article.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(article.created_at)}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold leading-tight text-slate-950 transition group-hover:text-orange-500 dark:text-white">
                      {article.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm text-slate-500 dark:text-slate-400">{article.excerpt}</p>
                    {article.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {article.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            #{t}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-xs text-slate-500">+{article.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                          {article.author_username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{article.author_username}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{article.view_count}</span>
                        <span>{article.like_count}</span>
                        <span>{article.comment_count}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!loading && articles.length === 0 && (
                <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <PenSquare className="mx-auto h-10 w-10 text-slate-400" />
                  <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">No articles found</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {category || tag ? 'Try adjusting your filters' : 'Be the first to write an article'}
                  </p>
                  {!category && !tag && (
                    <button
                      onClick={() => navigate('/blog/new')}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-950"
                    >
                      <PenSquare className="h-4 w-4" />
                      Write Article
                    </button>
                  )}
                </div>
              )}

              {articles.length > 0 && !sort && (
                <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  <span className="text-slate-500 dark:text-slate-400">Page {page}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                      disabled={page === 1}
                      className="rounded-xl border border-slate-200 px-4 py-2 font-medium disabled:opacity-50 dark:border-slate-700"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => updateFilter('page', (page + 1).toString())}
                      disabled={!hasMore}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-950"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
