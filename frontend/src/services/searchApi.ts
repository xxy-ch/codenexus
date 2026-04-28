// Search API service
import api from './api'
import type {
  SearchQuery,
  SearchResponse,
  SearchSuggestionsResponse,
} from '@/types/search'

export const searchApi = {
  /**
   * Perform search across discussions and articles
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const params = new URLSearchParams()

    if (query.q) params.append('q', query.q)
    if (query.type) params.append('type', query.type)
    if (query.category) params.append('category', query.category)
    if (query.tag) params.append('tag', query.tag)
    if (query.author_id) params.append('author_id', query.author_id)
    if (query.sort) params.append('sort', query.sort)
    if (query.page) params.append('page', query.page.toString())
    if (query.limit) params.append('limit', query.limit.toString())

    const response = await api.get(`/search?${params.toString()}`)
    return response.data
  },

  /**
   * Get search suggestions for auto-complete
   */
  async getSuggestions(query: string): Promise<SearchSuggestionsResponse> {
    const params = new URLSearchParams()
    if (query) params.append('q', query)

    const response = await api.get(`/search/suggestions?${params.toString()}`)
    return response.data
  },

  /**
   * Quick search (all types, default parameters)
   */
  async quickSearch(
    query: string,
    page = 1,
    limit = 20
  ): Promise<SearchResponse> {
    return this.search({
      q: query,
      type: 'all',
      sort: 'relevance',
      page,
      limit,
    })
  },

  /**
   * Search only discussions
   */
  async searchDiscussions(
    query: string,
    options: Partial<SearchQuery> = {}
  ): Promise<SearchResponse> {
    return this.search({
      q: query,
      type: 'discussion',
      sort: 'relevance',
      page: 1,
      limit: 20,
      ...options,
    })
  },

  async searchProblems(
    query: string,
    options: Partial<SearchQuery> = {}
  ): Promise<SearchResponse> {
    return this.search({
      q: query,
      type: 'problem',
      sort: 'relevance',
      page: 1,
      limit: 20,
      ...options,
    })
  },
}
