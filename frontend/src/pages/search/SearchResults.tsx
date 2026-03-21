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
        setError('Failed to load search results. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [query, type, category, tag, sort, page])

  const hasActiveSearch = Boolean(query || category || tag)

  const summaryText = useMemo(() => {
    if (!results) {
      return 'Use one search flow for problems, discussions, and article content.'
    }

    return `${results.total_count} results across ${results.problem_count} problems and ${results.discussion_count} discussions.`
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
    return date.toLocaleDateString('en-US', {
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
              <span className="rounded-full border border-slate-200/90 bg-[rgba(246,249,253,0.92)] px-2 py-1">Problem</span>
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
              <span className="font-medium text-slate-700">#{item.problem_id}</span>
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
                Pinned
              </span>
            ) : null}
            {item.is_solved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                Solved
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
              {item.problem_id ? <span className="text-slate-700">Problem #{item.problem_id}</span> : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span>{item.view_count} views</span>
              <span>{item.reply_count} replies</span>
              <span>{item.like_count} likes</span>
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
          eyebrow="Search"
          title="Search the archive"
          description={summaryText}
          actions={
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          }
        />

        <FilterBar>
          <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row">
            <Input
              aria-label="Search query"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              placeholder="Search by title, tag, or content"
              className="md:flex-1"
            />
            <Button type="submit">Search</Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'problem', 'discussion'] as SearchType[]).map((typeOption) => (
              <Button
                key={typeOption}
                type="button"
                variant={type === typeOption ? 'primary' : 'outline'}
                size="sm"
                onClick={() => updateFilter('type', typeOption)}
              >
                {typeOption === 'all' ? 'All' : typeOption === 'problem' ? 'Problems' : 'Discussions'}
              </Button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="h-11 rounded-2xl border border-slate-200/90 bg-[rgba(255,255,255,0.88)] px-3 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <option value="relevance">Relevance</option>
              <option value="latest">Latest</option>
              <option value="popular">Popular</option>
            </select>
          </label>

          {hasActiveSearch ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
        </FilterBar>

        {loading ? (
          <SurfaceCard>
            <Loading message="Searching..." />
          </SurfaceCard>
        ) : error ? (
          <EmptyState
            title="Search is temporarily unavailable"
            description={error}
            action={
              <Button type="button" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          />
        ) : !hasActiveSearch ? (
          <EmptyState
            title="Start with a keyword"
            description="Search problems discussions and articles from one place."
          />
        ) : results && results.results.length === 0 ? (
          <EmptyState
            title="No results found"
            description="Try another keyword, remove a filter, or search a broader topic."
            action={
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-4">
              {results?.results.map((item) => renderResultItem(item))}
            </div>

            {results?.has_more ? (
              <div className="flex justify-center">
                <Button type="button" onClick={() => updateFilter('page', String(page + 1))}>
                  Load more results
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}
