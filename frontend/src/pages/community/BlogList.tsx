import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { blogApi } from '@/services/communityApi'
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

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const activeTitle = category || (sort === 'trending' ? '热门专栏' : sort === 'featured' ? '精选专栏' : '最近刊物')
  const featuredLead = featuredArticles[0]
  const visibleTagCount = useMemo(() => popularTags.slice(0, 8), [popularTags])

  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 md:px-8">
      <div className="grid gap-8 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <SurfaceCard className="space-y-4 bg-[#f5f7ff] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#0052cc] text-white">
                <span className="material-symbols-outlined text-lg">forum</span>
              </div>
              <div>
                <p className="font-['Manrope'] text-[1.05rem] font-extrabold text-[#131b2e]">社区专栏</p>
                <p className="text-xs text-[#65748d]">知识交换站</p>
              </div>
            </div>
            <Button onClick={() => navigate('/blog/new')} variant="primary">
              <span className="material-symbols-outlined text-base">edit_square</span>
              写文章
            </Button>
            <nav className="space-y-1 text-sm font-medium">
              {[
                ['全部文章', ''],
                ['热门专栏', 'trending'],
                ['精选专栏', 'featured'],
              ].map(([label, value]) => (
                <button
                  key={label}
                  onClick={() => (value ? navigate(`/blog?sort=${value}`) : navigate('/blog'))}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left transition-colors',
                    value ? sort === value : !category && !tag && !sort
                      ? 'bg-[#dbe4ff] text-[#17305e]'
                      : 'text-[#5f6d87] hover:bg-[#eef2ff]'
                  )}
                >
                  <span>{label}</span>
                  {label === '全部文章' ? <span className="text-xs font-bold">{articles.length}</span> : null}
                </button>
              ))}
            </nav>
          </SurfaceCard>

          <SurfaceCard tone="muted" className="space-y-3 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6b7ca7]">当前筛选</p>
            <div className="space-y-3 text-sm text-[#5f6d87]">
              <div className="rounded-[12px] bg-white/92 px-4 py-3">
                <p className="font-medium text-[#131b2e]">排序</p>
                <p className="mt-1">{sort || 'recent'}</p>
              </div>
              <div className="rounded-[12px] bg-white/92 px-4 py-3">
                <p className="font-medium text-[#131b2e]">分类</p>
                <p className="mt-1">{category || 'all'}</p>
              </div>
              <div className="rounded-[12px] bg-white/92 px-4 py-3">
                <p className="font-medium text-[#131b2e]">标签</p>
                <p className="mt-1">{tag || 'none'}</p>
              </div>
            </div>
            {(category || tag || sort) ? (
              <Button variant="outline" onClick={() => navigate('/blog')}>
                清空筛选
              </Button>
            ) : null}
          </SurfaceCard>
        </aside>

        <div className="space-y-8">
          {page === 1 && !category && !tag && !sort && featuredLead ? (
            <section className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#006847] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#dff8ea]">
                  精选专栏
                </div>
                <h1 className="mt-4 font-['Manrope'] text-[2.4rem] font-extrabold leading-[1.08] tracking-[-0.05em] text-[#131b2e] md:text-[3.2rem]">
                  {featuredLead.title}
                </h1>
                <p className="mt-5 max-w-2xl text-[15px] leading-8 text-[#5f6d87]">
                  {featuredLead.excerpt}
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e9eeff] text-sm font-bold text-[#003d9b]">
                    {featuredLead.author_username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#131b2e]">{featuredLead.author_username}</p>
                    <p className="text-xs text-[#65748d]">{formatDate(featuredLead.created_at)} · {featuredLead.comment_count} 条评论</p>
                  </div>
                  <button
                    onClick={() => navigate(`/blog/${featuredLead.slug}`)}
                    className="ml-0 inline-flex items-center gap-2 text-sm font-bold text-[#003d9b] transition-all hover:gap-3 lg:ml-6"
                  >
                    阅读全文
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div
                  onClick={() => navigate(`/blog/${featuredLead.slug}`)}
                  className="cursor-pointer overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#dbe4ff,#f4f6ff)] p-8 shadow-[0_18px_44px_rgba(19,27,46,0.06)]"
                >
                  <div className="flex h-[320px] items-end rounded-[18px] bg-[linear-gradient(180deg,rgba(0,61,155,0.12),rgba(0,82,204,0.28))] p-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#244171]">{featuredLead.category || '专栏'}</p>
                      <p className="mt-2 text-lg font-semibold text-[#131b2e]">{featuredLead.tags.slice(0, 2).join(' · ') || '算法专题'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex items-center justify-between">
            <h2 className="font-['Manrope'] text-[1.8rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">最近刊物</h2>
            <div className="flex gap-4">
            {[
                { label: '最新', value: '' },
                { label: '热门', value: 'trending' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => (item.value ? navigate(`/blog?sort=${item.value}`) : navigate('/blog'))}
                className={cn(
                    'text-sm transition-colors',
                  item.value ? sort === item.value : !category && !tag && !sort
                      ? 'font-semibold text-[#003d9b]'
                      : 'font-medium text-[#6b7ca7] hover:text-[#003d9b]'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          </div>

          <SurfaceCard tone="muted" className="space-y-4 p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => updateFilter('category', category === item ? '' : item)}
                  className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      category === item ? 'bg-[#003d9b] text-white' : 'bg-white text-[#5f6d87] hover:bg-[#eef2ff]'
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
                      tag === item.tag ? 'bg-[#131b2e] text-white' : 'bg-white text-[#5f6d87] hover:bg-[#eef2ff]'
                  )}
                >
                  #{item.tag}
                </button>
              ))}
              </div>
            </div>
          </SurfaceCard>

          {loading && page === 1 ? (
            <Loading message="Loading articles..." />
          ) : (
            <>
              <section>
                <div className="mb-5">
                  <p className="text-sm text-[#65748d]">{tag ? `当前标签：#${tag}` : '当前流展示真实博客内容和已落地过滤条件。'}</p>
                </div>
                {articles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {articles.map((article) => (
                      <article
                        key={article.id}
                        onClick={() => navigate(`/blog/${article.slug}`)}
                        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[18px] bg-[#ffffff] p-0 shadow-[0_12px_30px_rgba(19,27,46,0.05)] transition hover:bg-[#f9fbff]"
                      >
                        <div className="flex min-h-[168px] items-end bg-[linear-gradient(180deg,rgba(219,228,255,0.65),rgba(233,238,255,0.96))] p-5">
                          <div className="flex w-full items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                            {article.is_featured ? (
                                <span className="rounded-full bg-[#fff2d8] px-2.5 py-1 text-xs font-medium text-[#8a5a00]">
                                  精选
                              </span>
                            ) : null}
                            {article.category ? (
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-[#5f6d87]">
                                {article.category}
                              </span>
                            ) : null}
                          </div>
                            <span className="text-xs text-[#65748d]">{formatDate(article.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-[1.15rem] font-semibold leading-tight text-[#131b2e] transition-colors group-hover:text-[#003d9b]">{article.title}</h3>
                          <p className="mt-3 flex-1 text-sm leading-6 text-[#5f6d87]">{article.excerpt}</p>
                          {article.tags.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {article.tags.slice(0, 3).map((item) => (
                                <span key={item} className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-medium text-[#5f6d87]">
                                  #{item}
                                </span>
                              ))}
                              {article.tags.length > 3 ? (
                                <span className="text-xs text-[#6b7ca7]">+{article.tags.length - 3}</span>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="mt-6 flex items-center justify-between border-t border-[#e8ecf5] pt-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#131b2e] text-xs font-semibold text-white">
                              {article.author_username.charAt(0).toUpperCase()}
                            </div>
                              <span className="text-xs font-medium text-[#445472]">{article.author_username}</span>
                          </div>
                            <div className="flex items-center gap-3 text-xs text-[#6b7ca7]">
                              <span>{article.view_count} 浏览</span>
                              <span>{article.like_count} 喜欢</span>
                              <span>{article.comment_count} 评论</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                    <SurfaceCard className="py-12 text-center text-sm text-[#65748d]">
                      {category || tag ? '当前筛选条件下暂无文章。' : '当前还没有文章，第一篇就由你来写。'}
                    </SurfaceCard>
                )}

                {articles.length > 0 && !sort ? (
                    <div className="mt-5 flex items-center justify-between border-t border-[#e8ecf5] pt-5 text-sm">
                      <span className="text-[#6b7ca7]">第 {page} 页</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFilter('page', Math.max(1, page - 1).toString())}
                        disabled={page === 1}
                      >
                          上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateFilter('page', (page + 1).toString())}
                        disabled={!hasMore}
                      >
                          下一页
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
