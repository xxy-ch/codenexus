// Search types
export type SearchType = 'all' | 'discussion' | 'article'
export type SearchSort = 'relevance' | 'latest' | 'popular'

export interface SearchQuery {
  q: string
  type?: SearchType
  category?: string
  tag?: string
  author_id?: string
  sort?: SearchSort
  page?: number
  limit?: number
}

export interface DiscussionSearchResult {
  type: 'Discussion'
  id: number
  title: string
  content: string
  author_id: string
  author_username: string
  tags: string[]
  problem_id?: number
  is_solved: boolean
  is_pinned: boolean
  reply_count: number
  like_count: number
  view_count: number
  created_at: string
  relevance_score: number
  highlighted_title?: string
  highlighted_content?: string
}

export interface ArticleSearchResult {
  type: 'Article'
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  author_id: string
  author_username: string
  tags: string[]
  category?: string
  is_featured: boolean
  is_published: boolean
  like_count: number
  comment_count: number
  view_count: number
  published_at?: string
  created_at: string
  relevance_score: number
  highlighted_title?: string
  highlighted_content?: string
}

export type SearchResultItem = DiscussionSearchResult | ArticleSearchResult

export interface SearchResponse {
  query: string
  results: SearchResultItem[]
  total_count: number
  discussion_count: number
  article_count: number
  page: number
  limit: number
  has_more: boolean
}

export interface SearchSuggestion {
  text: string
  type: 'tag' | 'category' | 'recent'
  count: number
}

export interface SearchSuggestionsResponse {
  query: string
  suggestions: SearchSuggestion[]
}
