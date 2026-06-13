import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Bookmark, Flame, FolderKanban, PenSquare, Search, Sparkles, Star } from 'lucide-react'
import { BookOpen } from 'lucide-react'
import { blogApi } from '@/services/articlesApi'
import type { Article, ArticleFilters, PopularTag } from '@/types/community'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'

export function BlogList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState<Article[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [popularTags, setPopularTags] = useState<PopularTag[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined
  const sort = searchParams.get('sort') || undefined

  const fetchArticles = async () => {
    setLoading(true)
    setLoadError(false)
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
      setLoadError(true)
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

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const activeTitle = category || (sort === 'trending' ? '热门文章' : sort === 'featured' ? '精选文章' : '全部文章')

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-8 py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                CodeNexus 博客
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">博客</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
                  聚合教程、题解和公告内容，沉淀训练过程中的经验与观点。
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/blog/new')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <PenSquare className="h-4 w-4" />
                撰写文章
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">内容流</p>
            <div className="mt-4 space-y-2">
              {[
                { label: '全部文章', icon: Bookmark, value: '' },
                { label: '热门', icon: Flame, value: 'trending' },
                { label: '精选', icon: Star, value: 'featured' },
              ].map((item) => {
                const active = item.value ? sort === item.value : !category && !tag && !sort
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={() => (item.value ? navigate(`/blog?sort=${item.value}`) : navigate('/blog'))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-background'
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
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">分类</p>
              </div>
              <div className="mt-4 space-y-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateFilter('category', category === cat ? '' : cat)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition',
                      category === cat
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-background'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {popularTags.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">热门标签</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((item) => (
                  <button
                    key={item.tag}
                    onClick={() => updateFilter('tag', tag === item.tag ? '' : item.tag)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition',
                      tag === item.tag
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    )}
                  >
                    #{item.tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Content */}
        <div className="space-y-8">
          <div className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {activeTitle}
                {tag && <span className="ml-2 text-primary">#{tag}</span>}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                使用分类、标签和排序快速定位文章。
              </p>
            </div>
            {(category || tag || sort) && (
              <button
                onClick={() => navigate('/blog')}
                className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                清除筛选
              </button>
            )}
          </div>

          {loading && page === 1 ? (
            <CardGridSkeleton cards={6} />
          ) : loadError ? (
            <InlineError title="文章列表加载失败" onRetry={() => fetchArticles()} />
          ) : (
            <>
              {page === 1 && !category && !tag && !sort && featuredArticles.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">精选文章</h3>
                  </div>
                  <div
                    onClick={() => navigate(`/blog/${featuredArticles[0].slug}`)}
                    className="cursor-pointer rounded-2xl bg-background p-8 transition hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        精选
                      </span>
                      {featuredArticles[0].category && (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {featuredArticles[0].category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(featuredArticles[0].created_at)}</span>
                    </div>
                    <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">
                      {featuredArticles[0].title}
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm text-muted-foreground leading-relaxed">{featuredArticles[0].excerpt}</p>
                    <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {featuredArticles[0].author_username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{featuredArticles[0].author_username}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{featuredArticles[0].view_count} 阅读</span>
                        <span>{featuredArticles[0].like_count} 点赞</span>
                        <span>{featuredArticles[0].comment_count} 评论</span>
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
                    className="group flex h-full cursor-pointer flex-col bg-card border border-border rounded-2xl p-6 shadow-sm transition hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_7px]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {article.is_featured && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            精选
                          </span>
                        )}
                        {article.category && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {article.category}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(article.created_at)}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold leading-tight text-foreground transition group-hover:text-primary">
                      {article.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm text-muted-foreground leading-relaxed">{article.excerpt}</p>
                    {article.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {article.tags.slice(0, 3).map((t) => (
                          <span key={t} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            #{t}
                          </span>
                        ))}
                        {article.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{article.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {article.author_username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground">{article.author_username}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{article.view_count}</span>
                        <span>{article.like_count}</span>
                        <span>{article.comment_count}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {!loading && articles.length === 0 && (
                <EmptyState
                  icon={BookOpen}
                  title="暂无文章"
                  description="还没有发布任何文章"
                  action={
                    !category && !tag ? (
                      <button
                        onClick={() => navigate('/blog/new')}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                      >
                        <PenSquare className="h-4 w-4" />
                        撰写文章
                      </button>
                    ) : undefined
                  }
                />
              )}

              {articles.length > 0 && !sort && (
                <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-6 py-4 text-sm shadow-sm">
                  <span className="text-muted-foreground">第 {page} 页</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                      disabled={page === 1}
                      className="rounded-xl border border-border px-4 py-2 font-medium text-foreground disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <button
                      onClick={() => updateFilter('page', (page + 1).toString())}
                      disabled={!hasMore}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50"
                    >
                      下一页
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
