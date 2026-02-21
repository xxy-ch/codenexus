import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
import type { Article, ArticleFilters, PopularTag } from '@/types/community'
import { Loading } from '@/components/ui/Loading'

export function BlogList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState<Article[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [popularTags, setPopularTags] = useState<PopularTag[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)

  // Get filters from URL params
  const page = parseInt(searchParams.get('page') || '1')
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined

  const fetchArticles = async () => {
    setLoading(true)
    try {
      // Fetch main articles
      const filters: ArticleFilters = {
        page,
        limit: 12,
        category,
        tag,
      }
      const response = await blogApi.getArticles(filters)
      setArticles(response.articles)
      setHasMore(response.has_more)

      // Fetch featured and categories/tags only on first page
      if (page === 1 && !category && !tag) {
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
  }, [page, category, tag])

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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Blog</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/blog/new')}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all"
              >
                <span className="material-icons text-sm">edit</span>
                <span>Write Article</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
            {/* Navigation */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Feeds
                </h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => {
                      if (category || tag) {
                        navigate('/blog')
                      }
                    }}
                    className={`w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-colors ${
                      !category && !tag
                        ? 'bg-primary/10 text-primary'
                        : 'text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="material-icons text-lg mr-3">article</span>
                    All Posts
                  </button>
                  <button
                    onClick={() => navigate('/blog?sort=trending')}
                    className="w-full flex items-center px-2 py-2 text-sm font-medium text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                  >
                    <span className="material-icons text-lg mr-3">local_fire_department</span>
                    Trending
                  </button>
                  <button
                    onClick={() => navigate('/blog?sort=featured')}
                    className="w-full flex items-center px-2 py-2 text-sm font-medium text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                  >
                    <span className="material-icons text-lg mr-3">star</span>
                    Featured
                  </button>
                </nav>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="border-t border-border-light dark:border-border-dark p-4">
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Categories
                  </h3>
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => updateFilter('category', category === cat ? '' : cat)}
                        className={`w-full flex items-center px-2 py-1.5 text-sm rounded-lg transition-colors ${
                          category === cat
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="material-icons text-lg mr-3">folder</span>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Trending Tags */}
            {popularTags.length > 0 && (
              <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">
                  Trending Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map(({ tag }) => (
                    <button
                      key={tag}
                      onClick={() => updateFilter('tag', tag === tag ? '' : tag)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        tag === tag
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Main Content */}
          <div className="flex-grow space-y-6">
            {/* Filter Info */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {category || 'All Posts'}
                {tag && <span className="text-primary ml-2">#{tag}</span>}
              </h2>
              {(category || tag) && (
                <button
                  onClick={() => navigate('/blog')}
                  className="text-sm text-text-muted hover:text-primary transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Loading State */}
            {loading && page === 1 ? (
              <Loading message="Loading articles..." />
            ) : (
              <>
                {/* Featured Articles (only on first page, no filters) */}
                {page === 1 && !category && !tag && featuredArticles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="material-icons text-yellow-500">star</span>
                      Featured Articles
                    </h3>
                    <div className="relative bg-surface-light dark:bg-surface-dark rounded-xl shadow-md border-t-4 border-yellow-500 overflow-hidden">
                      <div
                        onClick={() => navigate(`/blog/${featuredArticles[0].slug}`)}
                        className="p-6 md:p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                            Featured
                          </span>
                          {featuredArticles[0].category && (
                            <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                              {featuredArticles[0].category}
                            </span>
                          )}
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            <span className="material-icons text-[14px]">schedule</span>
                            {formatDate(featuredArticles[0].created_at)}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 hover:text-primary transition-colors">
                          {featuredArticles[0].title}
                        </h2>
                        <p className="text-text-muted mb-4 line-clamp-2">
                          {featuredArticles[0].excerpt}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {featuredArticles[0].author_username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {featuredArticles[0].author_username}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-text-muted text-sm">
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">visibility</span>
                              {featuredArticles[0].view_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">thumb_up</span>
                              {featuredArticles[0].like_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-icons text-base">chat_bubble_outline</span>
                              {featuredArticles[0].comment_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Articles Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articles.map((article) => (
                    <article
                      key={article.id}
                      onClick={() => navigate(`/blog/${article.slug}`)}
                      className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col h-full"
                    >
                      <div className="p-5 flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex gap-2 flex-wrap">
                            {article.is_featured && (
                              <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs px-2 py-0.5 rounded-full font-medium">
                                Featured
                              </span>
                            )}
                            {article.category && (
                              <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                {article.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {formatDate(article.created_at)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-text-muted mb-4 line-clamp-3">
                          {article.excerpt}
                        </p>
                        {article.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {article.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                #{t}
                              </span>
                            ))}
                            {article.tags.length > 3 && (
                              <span className="text-xs text-text-muted">
                                +{article.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {article.author_username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {article.author_username}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-sm">visibility</span>
                            {article.view_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-sm">thumb_up</span>
                            {article.like_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-sm">chat_bubble_outline</span>
                            {article.comment_count}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {/* Empty State */}
                {!loading && articles.length === 0 && (
                  <div className="text-center py-12">
                    <span className="material-icons text-6xl text-text-muted mb-4">article</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No articles found
                    </h3>
                    <p className="text-text-muted mb-6">
                      {category || tag
                        ? 'Try adjusting your filters'
                        : 'Be the first to write an article!'}
                    </p>
                    {!category && !tag && (
                      <button
                        onClick={() => navigate('/blog/new')}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium"
                      >
                        <span className="material-icons">edit</span>
                        Write Article
                      </button>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {articles.length > 0 && (
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
