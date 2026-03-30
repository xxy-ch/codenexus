import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
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
        <Card
          key={`problem-${item.id}`}
          variant="surface"
          className="cursor-pointer transition-all duration-200 hover:border-primary/30"
        >
          <button
            type="button"
            onClick={() => navigate(`/problems/${item.problem_id}`)}
            className="w-full text-left"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-1">题目</span>
              {item.difficulty ? (
                <span className="rounded-full border border-outline-variant bg-surface px-2 py-1 normal-case text-on-surface">
                  {item.difficulty}
                </span>
              ) : null}
            </div>

            <h2
              className="text-lg font-semibold text-on-surface"
              dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
            />

            <div
              className="mt-2 text-sm leading-6 text-on-surface-variant"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content || item.excerpt }}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
              <div className="flex flex-wrap items-center gap-3">
                <span>{item.author_username}</span>
                <span>{formatDate(item.created_at)}</span>
              </div>
              <span className="font-medium text-on-surface">题号 #{item.problem_id}</span>
            </div>
          </button>
        </Card>
      )
    }

    return (
      <Card
        key={`discussion-${item.id}`}
        variant="surface"
        className="cursor-pointer transition-all duration-200 hover:border-primary/30"
      >
        <button
          type="button"
          onClick={() => navigate(`/discussions/${item.id}`)}
          className="w-full text-left"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-on-surface-variant">
            {item.is_pinned ? (
              <span className="rounded-full border border-outline-variant bg-surface-container-low px-2 py-1 uppercase tracking-wide">
                置顶
              </span>
            ) : null}
            {item.is_solved ? (
              <span className="rounded-full border border-tertiary bg-tertiary-container/30 px-2 py-1 text-on-tertiary-container">
                已解决
              </span>
            ) : null}
            {item.tags.map((entry) => (
              <span key={entry} className="rounded-full border border-outline-variant bg-surface px-2 py-1 text-on-surface">
                #{entry}
              </span>
            ))}
          </div>

          <h2
            className="text-lg font-semibold text-on-surface"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          {item.highlighted_content ? (
            <div
              className="mt-2 text-sm leading-6 text-on-surface-variant"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content }}
            />
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
            <div className="flex flex-wrap items-center gap-3">
              <span>{item.author_username}</span>
              <span>{formatDate(item.created_at)}</span>
              {item.problem_id ? <span className="text-on-surface">关联题目 #{item.problem_id}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span>{item.view_count} 次浏览</span>
              <span>{item.reply_count} 条回复</span>
              <span>{item.like_count} 个赞</span>
            </div>
          </div>
        </button>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            搜索工作台
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            搜索内容库
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">{summaryText}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        {/* Hero Card */}
        <Card variant="default" className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-on-primary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/70">结果概览</p>
              <h2 className="mt-3 font-headline text-3xl font-extrabold text-on-primary md:text-4xl">搜索工作台</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/80">
                把搜索词、结果分布和结果池放在同一工作区里，避免回到零散卡片流。
              </p>
            </div>
            <div className="rounded-2xl border border-on-primary/20 bg-on-primary/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/60">当前关键词</p>
              <p className="mt-2 text-2xl font-semibold text-on-primary">{query || '未输入关键词'}</p>
              <p className="mt-2 text-sm text-on-primary/70">共 {results?.total_count ?? 0} 条结果</p>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-2">
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">题目结果</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">{results?.problem_count ?? 0}</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">讨论结果</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">{results?.discussion_count ?? 0}</p>
          </Card>
        </div>
      </div>

      {/* Filter Bar */}
      <Card variant="surface" className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            aria-label="搜索关键词"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="按标题、标签或正文搜索"
            className="md:flex-1"
          />
          <Button type="submit">搜索</Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {(['all', 'problem', 'discussion'] as SearchType[]).map((typeOption) => (
            <Button
              key={typeOption}
              type="button"
              variant={type === typeOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilter('type', typeOption)}
            >
              {typeOption === 'all' ? '全部结果' : typeOption === 'problem' ? '题目' : '讨论'}
            </Button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>排序</span>
            <select
              aria-label="排序"
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="h-10 rounded-xl border border-outline-variant bg-surface px-4 text-sm font-semibold text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
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
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingState message="正在搜索..." />
        </div>
      ) : error ? (
        <EmptyState
          title="搜索暂时不可用"
          description={error}
          action={{ label: '重试', onClick: () => window.location.reload() }}
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
          action={{ label: '清空筛选', onClick: clearFilters }}
        />
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">结果池</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">结果池</h2>
            </div>

            <div className="grid gap-4">{results?.results.map((item) => renderResultItem(item))}</div>
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
  )
}
