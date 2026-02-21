// Discussion Types

export interface Discussion {
  id: number
  title: string
  content: string
  author_id: string
  author_username: string
  problem_id?: number
  problem_title?: string
  tags: string[]
  is_pinned: boolean
  is_solved: boolean
  is_locked: boolean
  view_count: number
  reply_count: number
  like_count: number
  created_at: string
  updated_at: string
}

export interface DiscussionReply {
  id: number
  discussion_id: number
  parent_reply_id?: number
  content: string
  author_id: string
  author_username: string
  like_count: number
  is_solution: boolean
  created_at: string
  updated_at: string
  replies?: DiscussionReply[]
}

export interface DiscussionDetail {
  discussion: Discussion
  replies: DiscussionReply[]
  author: {
    id: string
    username: string
    avatar?: string
    role?: string
  }
  problem?: {
    id: number
    title: string
    difficulty: string
  }
}

export interface DiscussionFilters {
  page?: number
  limit?: number
  problem_id?: number
  tag?: string
  status?: 'solved' | 'unsolved' | 'all'
  sort?: 'latest' | 'popular' | 'unanswered'
}

export interface DiscussionListResponse {
  discussions: Discussion[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface CreateDiscussionRequest {
  title: string
  content: string
  problem_id?: number
  tags?: string[]
}

export interface UpdateDiscussionRequest {
  title?: string
  content?: string
  tags?: string[]
  is_solved?: boolean
}

export interface CreateReplyRequest {
  content: string
  parent_reply_id?: number
  is_solution?: boolean
}

// Blog Types

export interface Article {
  id: number
  title: string
  slug: string
  content: string
  excerpt: string
  author_id: string
  author_username: string
  tags: string[]
  category?: string
  is_published: boolean
  is_featured: boolean
  view_count: number
  like_count: number
  comment_count: number
  published_at?: string
  created_at: string
  updated_at: string
}

export interface ArticleComment {
  id: number
  article_id: number
  parent_comment_id?: number
  content: string
  author_id: string
  author_username: string
  like_count: number
  created_at: string
  updated_at: string
  replies?: ArticleComment[]
}

export interface ArticleDetail {
  article: Article
  comments: ArticleComment[]
  author: {
    id: string
    username: string
    avatar?: string
    role?: string
  }
}

export interface ArticleFilters {
  page?: number
  limit?: number
  category?: string
  tag?: string
  author_id?: string
}

export interface ArticleListResponse {
  articles: Article[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

export interface CreateArticleRequest {
  title: string
  content: string
  tags?: string[]
  category?: string
  is_published?: boolean
}

export interface UpdateArticleRequest {
  title?: string
  content?: string
  tags?: string[]
  category?: string
  is_published?: boolean
}

export interface CreateCommentRequest {
  content: string
  parent_comment_id?: number
}

// Common Types

export interface LikeResponse {
  liked: boolean
  like_count: number
}

export interface Category {
  name: string
  count: number
}

export interface PopularTag {
  tag: string
  count: number
}
