import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/page/PageHeader'
import { SurfaceCard } from '@/components/page/SurfaceCard'
import { EmptyState } from '@/components/page/EmptyState'
import { FilterBar } from '@/components/page/FilterBar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'
import { searchApi } from '@/services/searchApi'
import type { SearchResponse, SearchResultItem, SearchSort, SearchType } from '@/types/search'

export function SearchResults() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftQuery, setDraftQuery] = useState('')

  const query = searchParams.get('q') || ''
  const type = (searchParams.get('type') as SearchType) || 'all'
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined
  const sort = (searchParams.get('sort') as SearchSort) || 'relevance'
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    setDraftQuery(query)
  }, [query])

  useEffect(() => {
    const fetchResults = async () => {
      if (!query && !category && !tag) {
        setResults(null)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await searchApi.search({
          q: query,
          type,
          category,
          tag,
          sort,
          page,
          limit: 20,
        })
        setResults(response)
      } catch (err) {
        console.error('Search failed:', err)
        setError('搜索结果加载失败，请稍后重试。')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, type, category, tag, sort, page])

  const hasActiveSearch = Boolean(query || category || tag)

  const summaryText = useMemo(() => {
    if (!results) {
      return '用同一个搜索入口浏览题目、讨论与文章内容。'
    }

    return `共找到 ${results.total_count} 条结果，其中题目 ${results.problem_count} 条，讨论 ${results.discussion_count} 条。`
  }, [results])

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

  const clearFilters = () => {
    setSearchParams(new URLSearchParams())
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilter('q', draftQuery.trim())
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderResultItem = (item: SearchResultItem) => {
    if (item.type === 'Problem') {
      return (
        <SurfaceCard
          key={`problem-${item.id}`}
          className="cursor-pointer space-y-4 transition-all duration-200 hover:border-blue-200 hover:shadow-[0_18px_36px_rgba(30,64,175,0.08)]"
        >
          <button
            type="button"
            onClick={() => navigate(`/problems/${item.problem_id}`)}
            className="w-full text-left"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span className="rounded-full border border-slate-200/90 bg-[rgba(246,249,253,0.92)] px-2 py-1">题目</span>
              {item.difficulty ? (
                <span className="rounded-full border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-2 py-1 normal-case text-slate-600">
                  {item.difficulty}
                </span>
              ) : null}
            </div>

            <h2
              className="text-lg font-semibold text-slate-950"
              dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
            />

            <div
              className="mt-2 text-sm leading-6 text-slate-600"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content || item.excerpt }}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <span>{item.author_username}</span>
                <span>{formatDate(item.created_at)}</span>
              </div>
              <span className="font-medium text-slate-700">题号 #{item.problem_id}</span>
            </div>
          </button>
        </SurfaceCard>
      )
    }

    return (
        <SurfaceCard
          key={`discussion-${item.id}`}
          className="cursor-pointer space-y-4 transition-all duration-200 hover:border-blue-200 hover:shadow-[0_18px_36px_rgba(30,64,175,0.08)]"
        >
        <button
          type="button"
          onClick={() => navigate(`/discussions/${item.id}`)}
          className="w-full text-left"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            {item.is_pinned ? (
              <span className="rounded-full border border-slate-200/90 bg-[rgba(246,249,253,0.92)] px-2 py-1 uppercase tracking-wide">
                置顶
              </span>
            ) : null}
            {item.is_solved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                已解决
              </span>
            ) : null}
            {item.tags.map((entry) => (
              <span key={entry} className="rounded-full border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-2 py-1 text-slate-600">
                #{entry}
              </span>
            ))}
          </div>

          <h2
            className="text-lg font-semibold text-slate-950"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          {item.highlighted_content ? (
            <div
              className="mt-2 text-sm leading-6 text-slate-600"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content }}
            />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap items-center gap-3">
              <span>{item.author_username}</span>
              <span>{formatDate(item.created_at)}</span>
              {item.problem_id ? <span className="text-slate-700">关联题目 #{item.problem_id}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span>{item.view_count} 次浏览</span>
              <span>{item.reply_count} 条回复</span>
              <span>{item.like_count} 个赞</span>
            </div>
          </div>
        </button>
      </SurfaceCard>
    )
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          eyebrow="搜索工作台"
          title="搜索内容库"
          description={summaryText}
          actions={
            <Button variant="outline" onClick={() => navigate(-1)}>
              返回
            </Button>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
          <SurfaceCard className="overflow-hidden bg-[linear-gradient(135deg,rgba(7,43,117,0.98)_0%,rgba(13,82,186,0.96)_54%,rgba(140,198,255,0.9)_100%)] px-6 py-6 text-white shadow-[0_22px_48px_rgba(8,50,132,0.22)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">结果概览</p>
                <h2 className="mt-3 font-['Manrope'] text-[2rem] font-extrabold tracking-[-0.05em] text-white md:text-[2.5rem]">搜索工作台</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                  把搜索词、结果分布和结果池放在同一工作区里，避免回到零散卡片流。
                </p>
              </div>
              <div className="rounded-[28px] border border-white/16 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">当前关键词</p>
                <p className="mt-2 text-2xl font-semibold text-white">{query || '未输入关键词'}</p>
                <p className="mt-2 text-sm text-white/74">共 {results?.total_count ?? 0} 条结果</p>
              </div>
            </div>
          </SurfaceCard>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
            <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.94)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">题目结果</p>
              <p className="mt-3 text-3xl font-semibold text-[#131b2e]">{results?.problem_count ?? 0}</p>
            </SurfaceCard>
            <SurfaceCard className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.94)_100%)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4f6ea8]">讨论结果</p>
              <p className="mt-3 text-3xl font-semibold text-[#131b2e]">{results?.discussion_count ?? 0}</p>
            </SurfaceCard>
          </div>
        </div>

        <FilterBar>
          <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row">
            <Input
              aria-label="搜索关键词"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="按标题、标签或正文搜索"
              className="md:flex-1"
            />
            <Button type="submit">搜索</Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'problem', 'discussion'] as SearchType[]).map((typeOption) => (
              <Button
                key={typeOption}
                type="button"
                variant={type === typeOption ? 'primary' : 'outline'}
                size="md"
                onClick={() => updateFilter('type', typeOption)}
              >
                {typeOption === 'all' ? '全部结果' : typeOption === 'problem' ? '题目' : '讨论'}
              </Button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>排序</span>
            <select
              aria-label="排序"
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="h-12 rounded-[16px] border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-4 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <option value="relevance">相关度</option>
              <option value="latest">最新</option>
              <option value="popular">热门</option>
            </select>
          </label>

          {hasActiveSearch ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              清空筛选
            </Button>
          ) : null}
        </FilterBar>

        {loading ? (
          <SurfaceCard>
            <Loading message="正在搜索..." />
          </SurfaceCard>
        ) : error ? (
          <EmptyState
            title="搜索暂时不可用"
            description={error}
            action={
              <Button type="button" onClick={() => window.location.reload()}>
                重试
              </Button>
            }
          />
        ) : !hasActiveSearch ? (
          <EmptyState
            title="先输入一个关键词"
            description="从同一个入口搜索题目、讨论和文章。"
          />
        ) : results && results.results.length === 0 ? (
          <EmptyState
            title="没有找到匹配结果"
            description="可以更换关键词、减少筛选条件，或尝试更宽泛的主题。"
            action={
              <Button type="button" variant="outline" onClick={clearFilters}>
                清空筛选
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#4f6ea8]">结果池</p>
                <h2 className="mt-2 font-['Manrope'] text-[1.45rem] font-extrabold tracking-[-0.04em] text-[#131b2e]">结果池</h2>
              </div>

              <div className="grid gap-4">
              {results?.results.map((item) => renderResultItem(item))}
              </div>
            </div>

            {results?.has_more ? (
              <div className="flex justify-center">
                <Button type="button" onClick={() => updateFilter('page', String(page + 1))}>
                  加载更多
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
