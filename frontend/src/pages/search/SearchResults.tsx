import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SearchX, ArrowLeft, Eye, MessageCircle, ThumbsUp, Pin, CheckCircle, Clock } from 'lucide-react'
import { searchApi } from '@/services/searchApi'
import type { SearchResponse, SearchResultItem, SearchType, SearchSort } from '@/types/search'
import { SearchBar } from '@/components/search/SearchBar'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { InlineError } from '@/components/ui/InlineError'
import { cn } from '@/lib/utils'

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
        setError('搜索加载失败，请重试。')
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
    params.delete('page')
    setSearchParams(params)
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
        <article
          key={`problem-${item.id}`}
          onClick={() => navigate(`/problems/${item.problem_id}`)}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_7px] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              题目
            </span>
            {item.difficulty && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {item.difficulty}
              </span>
            )}
          </div>

          <h3
            className="text-lg font-bold text-foreground mb-2"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          <div
            className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.highlighted_content || item.excerpt }}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
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
          className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-[rgba(0,0,0,0.04)_0px_4px_18px,rgba(0,0,0,0.02)_0px_2px_7px] transition cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {item.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
            {item.is_solved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-accepted/10 px-2.5 py-1 text-xs font-medium text-status-accepted">
                <CheckCircle className="h-3 w-3" />
                已解决
              </span>
            )}
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                #{t}
              </span>
            ))}
          </div>

          <h3
            className="text-lg font-bold text-foreground mb-2"
            dangerouslySetInnerHTML={{ __html: item.highlighted_title || item.title }}
          />

          {item.highlighted_content && (
            <div
              className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: item.highlighted_content }}
            />
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="font-medium">{item.author_username}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(item.created_at)}
              </span>
              {item.problem_id && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                  题目 #{item.problem_id}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {item.view_count}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" />
                {item.reply_count}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3.5 w-3.5" />
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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 max-w-2xl">
            <SearchBar placeholder="搜索..." className="w-full" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center bg-background border border-border rounded-xl p-1">
            {(['all', 'problem', 'discussion'] as SearchType[]).map((typeOption) => (
              <button
                key={typeOption}
                onClick={() => updateFilter('type', typeOption)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition',
                  type === typeOption
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {typeOption === 'all'
                  ? '全部'
                  : typeOption === 'problem'
                    ? '题目'
                    : typeOption === 'discussion'
                      ? '讨论'
                      : '未知'}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="relevance">相关性</option>
            <option value="latest">最新</option>
            <option value="popular">热门</option>
          </select>

          {results && (
            <div className="ml-auto text-sm text-muted-foreground">
              {results.total_count} 个结果
              {results.total_count > 0 && (
                <span className="ml-2">
                  ({results.problem_count} 个题目, {results.discussion_count} 个讨论)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <CardGridSkeleton cards={4} />
      ) : error ? (
        <InlineError title="搜索失败" onRetry={() => { const fetchResults = async () => { if (!query && !category && !tag) { setResults(null); setLoading(false); return; } setLoading(true); setError(null); try { const response = await searchApi.search({ q: query, type, category, tag, sort, page, limit: 20 }); setResults(response); } catch (err) { setError('搜索加载失败，请重试。'); } finally { setLoading(false); } }; fetchResults(); }} />
      ) : !query && !category && !tag ? (
        <div className="text-center py-20">
          <h2 className="text-xl font-bold text-foreground mb-2">
            输入搜索关键词
          </h2>
          <p className="text-muted-foreground">
            跨题目和讨论进行搜索
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
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
            >
              清除筛选
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-4">
            {results?.results.map((item) => renderResultItem(item))}
          </div>

          {results && results.has_more && (
            <div className="flex justify-center">
              <button
                onClick={() => updateFilter('page', (page + 1).toString())}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
              >
                加载更多结果
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
