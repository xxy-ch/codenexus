import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { searchApi } from '@/services/searchApi'
import type { SearchResponse, SearchResultItem, SearchType, SearchSort } from '@/types/search'
import { SearchBar } from '@/components/search/SearchBar'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'

export function SearchResults() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('q') || ''
  const type = (searchParams.get('type') as SearchType) || 'all'
  const category = searchParams.get('category') || undefined
  const tag = searchParams.get('tag') || undefined
  const sort = (searchParams.get('sort') as SearchSort) || 'relevance'
  const page = parseInt(searchParams.get('page') || '1')

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

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page') // Reset to page 1 when changing filters
    setSearchParams(params)
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
        <article
          key={`problem-${item.id}`}
          onClick={() => navigate(`/problems/${item.problem_id}`)}
          className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold uppercase">
              Problem
            </span>
            {item.difficulty && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-medium">
                {item.difficulty}
              </span>
            )}
          </div>

          <h3
            className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          <div
            className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: item.highlighted_content || item.excerpt }}
          />

          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-3">
              <span className="font-medium">{item.author_username}</span>
              <span>{formatDate(item.created_at)}</span>
            </div>
            <div className="font-medium text-primary">#{item.problem_id}</div>
          </div>
        </article>
      )
    }

    if (item.type === 'Discussion') {
      return (
        <article
          key={`discussion-${item.id}`}
          onClick={() => navigate(`/discussions/${item.id}`)}
          className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          {/* Tags and badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {item.is_pinned && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-semibold uppercase">
                Pinned
              </span>
            )}
            {item.is_solved && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="material-icons text-[14px]">check_circle</span>
                Solved
              </span>
            )}
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3
            className="text-lg font-semibold text-gray-900 dark:text-white mb-2"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          {/* Content preview */}
          {item.highlighted_content && (
            <div
              className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content }}
            />
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-3">
              <span className="font-medium">{item.author_username}</span>
              <span>{formatDate(item.created_at)}</span>
              {item.problem_id && (
                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                  Problem #{item.problem_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="material-icons text-base">visibility</span>
                {item.view_count}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-icons text-base">chat_bubble_outline</span>
                {item.reply_count}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-icons text-base">thumb_up</span>
                {item.like_count}
              </span>
            </div>
          </div>
        </article>
      )
    }

    return null
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="material-icons text-gray-600 dark:text-gray-400">arrow_back</span>
            </button>
            <div className="flex-1 max-w-2xl">
              <SearchBar placeholder="Search..." className="w-full" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Type filter */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['all', 'problem', 'discussion'] as SearchType[]).map((typeOption) => (
                <button
                  key={typeOption}
                  onClick={() => updateFilter('type', typeOption)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    type === typeOption
                      ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                      : 'text-text-muted hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {typeOption === 'all'
                    ? 'All'
                    : typeOption === 'problem'
                      ? 'Problems'
                    : typeOption === 'discussion'
                      ? 'Discussions'
                      : 'Unknown'}
                </button>
              ))}
            </div>

            {/* Sort filter */}
            <select
              value={sort}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="relevance">Relevance</option>
              <option value="latest">Latest</option>
              <option value="popular">Popular</option>
            </select>

            {/* Results count */}
            {results && (
              <div className="ml-auto text-sm text-text-muted">
                {results.total_count} results
                {results.total_count > 0 && (
                  <span className="ml-2">
                    ({results.problem_count} problems, {results.discussion_count} discussions)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <CardGridSkeleton cards={4} />
        ) : error ? (
          <InlineError title="搜索失败" onRetry={() => { const fetchResults = async () => { if (!query && !category && !tag) { setResults(null); setLoading(false); return; } setLoading(true); setError(null); try { const response = await searchApi.search({ q: query, type, category, tag, sort, page, limit: 20 }); setResults(response); } catch (err) { setError('Failed to load search results. Please try again.'); } finally { setLoading(false); } }; fetchResults(); }} />
        ) : !query && !category && !tag ? (
          <div className="text-center py-12">
            <span className="material-icons text-6xl text-text-muted mb-4">search</span>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Enter a search query
            </h2>
            <p className="text-text-muted">
              Search across problems and discussions
            </p>
          </div>
        ) : results && results.results.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="未找到结果"
            description="尝试调整搜索词或清除筛选条件"
            action={
              <button
                onClick={() => {
                  setSearchParams(new URLSearchParams())
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {results?.results.map((item) => renderResultItem(item))}
            </div>

            {/* Pagination */}
            {results && results.has_more && (
              <div className="flex justify-center">
                <button
                  onClick={() => updateFilter('page', (page + 1).toString())}
                  className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors flex items-center gap-2"
                >
                  Load More Results
                  <span className="material-icons text-lg">expand_more</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
