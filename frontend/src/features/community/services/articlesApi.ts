import api from '@/shared/services/api'
import type {
  Article,
  ArticleDetail,
  ArticleFilters,
  ArticleListResponse,
  CreateArticleRequest,
  UpdateArticleRequest,
  ArticleComment,
  CreateCommentRequest,
  LikeResponse,
  PopularTag,
} from '@/features/community/types/community'

function getExcerpt(content: string, limit = 160) {
  if (!content) return ''
  return content.length > limit ? `${content.slice(0, limit)}...` : content
}

function normalizeLikeResponse(data: unknown): LikeResponse {
  if (typeof data === 'boolean') {
    return { liked: data, like_count: -1 }
  }

  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>
    const liked = typeof payload.liked === 'boolean' ? payload.liked : Boolean(payload.like_count)
    const likeCount = payload.like_count === undefined ? -1 : Number(payload.like_count) || 0
    return { liked, like_count: likeCount }
  }

  return { liked: false, like_count: -1 }
}

function normalizeArticle(data: unknown): Article {
  const payload = (data || {}) as Record<string, unknown>
  const content = String(payload.content || '')
  const summary = payload.summary ? String(payload.summary) : ''

  return {
    id: Number(payload.id) || 0,
    title: String(payload.title || ''),
    slug: String(payload.slug || payload.id || ''),
    content,
    excerpt: String(payload.excerpt || summary || getExcerpt(content)),
    author_id: String(payload.author_id || ''),
    author_username: String(payload.author_username || 'unknown'),
    tags: Array.isArray(payload.tags) ? payload.tags.map((t) => String(t)) : [],
    category: payload.category ? String(payload.category) : undefined,
    is_published: Boolean(payload.is_published),
    is_featured: Boolean(payload.is_featured),
    view_count: Number(payload.view_count) || 0,
    like_count: Number(payload.like_count) || 0,
    comment_count: Number(payload.comment_count) || 0,
    published_at: payload.published_at ? String(payload.published_at) : undefined,
    created_at: String(payload.created_at || new Date().toISOString()),
    updated_at: String(payload.updated_at || new Date().toISOString()),
  }
}

function normalizeArticleComment(data: unknown): ArticleComment {
  const payload = (data || {}) as Record<string, unknown>

  return {
    id: Number(payload.id) || 0,
    article_id: Number(payload.article_id) || 0,
    parent_comment_id: payload.parent_comment_id
      ? Number(payload.parent_comment_id)
      : payload.parent_id
        ? Number(payload.parent_id)
        : undefined,
    content: String(payload.content || ''),
    author_id: String(payload.author_id || ''),
    author_username: String(payload.author_username || 'unknown'),
    like_count: Number(payload.like_count) || 0,
    created_at: String(payload.created_at || new Date().toISOString()),
    updated_at: String(payload.updated_at || new Date().toISOString()),
    replies: Array.isArray(payload.replies)
      ? payload.replies.map((reply) => normalizeArticleComment(reply))
      : undefined,
  }
}

function normalizeArticleDetail(data: unknown): ArticleDetail {
  const payload = (data || {}) as Record<string, unknown>
  const article = normalizeArticle(payload.article)

  return {
    article,
    comments: Array.isArray(payload.comments)
      ? payload.comments.map((comment) => normalizeArticleComment(comment))
      : [],
    author: payload.author && typeof payload.author === 'object'
      ? {
          id: String((payload.author as Record<string, unknown>).id || article.author_id),
          username: String((payload.author as Record<string, unknown>).username || article.author_username || 'unknown'),
          avatar: (payload.author as Record<string, unknown>).avatar
            ? String((payload.author as Record<string, unknown>).avatar)
            : undefined,
          role: (payload.author as Record<string, unknown>).role
            ? String((payload.author as Record<string, unknown>).role)
            : undefined,
        }
      : {
          id: article.author_id,
          username: article.author_username || 'unknown',
        },
  }
}

function normalizePopularTags(data: unknown): PopularTag[] {
  if (!Array.isArray(data)) return []

  return data
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        return {
          tag: String(item[0]),
          count: Number(item[1]) || 0,
        }
      }

      if (item && typeof item === 'object' && 'tag' in item && 'count' in item) {
        const tagItem = item as { tag: unknown; count: unknown }
        return {
          tag: String(tagItem.tag),
          count: Number(tagItem.count) || 0,
        }
      }

      return null
    })
    .filter((item): item is PopularTag => item !== null)
}

export const blogApi = {
  // Get articles list
  getArticles: async (filters: ArticleFilters = {}): Promise<ArticleListResponse> => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.category) params.append('category', filters.category)
    if (filters.tag) params.append('tag', filters.tag)
    if (filters.author_id) params.append('author_id', filters.author_id)
    if (filters.sort) params.append('sort', filters.sort)

    const response = await api.get(`/blog?${params.toString()}`)
    const payload = (response.data || {}) as Record<string, unknown>
    const articles = Array.isArray(payload.articles)
      ? payload.articles.map((item) => normalizeArticle(item))
      : []
    const total = Number(payload.total) || 0
    const limit = Number(payload.limit || filters.limit) || 10
    const page = Number(payload.page || filters.page) || 1
    const pages = Number(payload.pages) || Math.ceil(total / Math.max(1, limit))

    return {
      articles,
      total,
      page,
      limit,
      has_more: page < pages,
    }
  },

  // Get trending articles
  getTrendingArticles: async (limit = 10): Promise<Article[]> => {
    const response = await api.get(`/blog/trending?limit=${limit}`)
    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeArticle(item))
      : []
  },

  // Get featured articles
  getFeaturedArticles: async (limit = 5): Promise<Article[]> => {
    const response = await api.get(`/blog/featured?limit=${limit}`)
    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeArticle(item))
      : []
  },

  // Get article detail
  getArticle: async (slugOrId: string): Promise<ArticleDetail> => {
    const response = await api.get(`/blog/${slugOrId}`)
    return normalizeArticleDetail(response.data)
  },

  // Create article
  createArticle: async (data: CreateArticleRequest): Promise<Article> => {
    const response = await api.post('/blog', data)
    return normalizeArticle(response.data)
  },

  // Update article
  updateArticle: async (slugOrId: string, data: UpdateArticleRequest): Promise<Article> => {
    const response = await api.patch(`/blog/${slugOrId}`, data)
    return normalizeArticle(response.data)
  },

  // Delete article
  deleteArticle: async (slugOrId: string): Promise<void> => {
    await api.delete(`/blog/${slugOrId}`)
  },

  // Get comments
  getComments: async (articleSlugOrId: string): Promise<ArticleComment[]> => {
    const response = await api.get(`/blog/${articleSlugOrId}/comments`)
    return Array.isArray(response.data)
      ? response.data.map((item) => normalizeArticleComment(item))
      : []
  },

  // Create comment
  createComment: async (
    articleSlugOrId: string,
    data: CreateCommentRequest
  ): Promise<ArticleComment> => {
    const response = await api.post(
      `/blog/${articleSlugOrId}/comments`,
      {
        content: data.content,
        parent_id: data.parent_comment_id,
      }
    )
    return normalizeArticleComment(response.data)
  },

  // Like article
  likeArticle: async (id: number): Promise<LikeResponse> => {
    const response = await api.post(
      `/blog/${id}/like`,
      {}
    )
    return normalizeLikeResponse(response.data)
  },

  // Like comment
  likeComment: async (commentId: number): Promise<LikeResponse> => {
    const response = await api.post(
      `/blog/comments/${commentId}/like`,
      {}
    )
    return normalizeLikeResponse(response.data)
  },

  // Get categories
  getCategories: async (): Promise<string[]> => {
    const response = await api.get(`/blog/categories`)
    return response.data
  },

  // Get popular tags
  getPopularTags: async (limit = 20): Promise<PopularTag[]> => {
    const response = await api.get(`/blog/tags/popular?limit=${limit}`)
    return normalizePopularTags(response.data)
  },
}
