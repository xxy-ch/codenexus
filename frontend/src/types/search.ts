// Search types
export type SearchType = 'all' | 'problem' | 'discussion'
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

export interface ProblemSearchResult {
  type: 'Problem'
  id: number
  title: string
  content: string
  excerpt: string
  author_id: string
  author_username: string
  difficulty?: string
  problem_id: number
  like_count: number
  view_count: number
  created_at: string
  relevance_score: number
  highlighted_title?: string
  highlighted_content?: string
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

export type SearchResultItem = ProblemSearchResult | DiscussionSearchResult

export interface SearchResponse {
  query: string
  results: SearchResultItem[]
  total_count: number
  problem_count: number
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
