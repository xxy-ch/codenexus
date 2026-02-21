import axios from 'axios'
import type {
  Discussion,
  DiscussionDetail,
  DiscussionFilters,
  DiscussionListResponse,
  CreateDiscussionRequest,
  UpdateDiscussionRequest,
  DiscussionReply,
  CreateReplyRequest,
  LikeResponse,
  Article,
  ArticleDetail,
  ArticleFilters,
  ArticleListResponse,
  CreateArticleRequest,
  UpdateArticleRequest,
  ArticleComment,
  CreateCommentRequest,
  PopularTag,
} from '@/types/community'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Discussions API
export const discussionsApi = {
  // Get discussions list
  getDiscussions: async (filters: DiscussionFilters = {}): Promise<DiscussionListResponse> => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.problem_id) params.append('problem_id', filters.problem_id.toString())
    if (filters.tag) params.append('tag', filters.tag)
    if (filters.status) params.append('status', filters.status)
    if (filters.sort) params.append('sort', filters.sort)

    const response = await axios.get(`${API_BASE}/api/discussions?${params.toString()}`)
    return response.data
  },

  // Get discussion detail
  getDiscussion: async (id: number): Promise<DiscussionDetail> => {
    const response = await axios.get(`${API_BASE}/api/discussions/${id}`)
    return response.data
  },

  // Create discussion
  createDiscussion: async (data: CreateDiscussionRequest): Promise<Discussion> => {
    const response = await axios.post(`${API_BASE}/api/discussions`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    return response.data
  },

  // Update discussion
  updateDiscussion: async (id: number, data: UpdateDiscussionRequest): Promise<Discussion> => {
    const response = await axios.patch(`${API_BASE}/api/discussions/${id}`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    return response.data
  },

  // Delete discussion
  deleteDiscussion: async (id: number): Promise<void> => {
    await axios.delete(`${API_BASE}/api/discussions/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
  },

  // Get replies
  getReplies: async (discussionId: number): Promise<DiscussionReply[]> => {
    const response = await axios.get(`${API_BASE}/api/discussions/${discussionId}/replies`)
    return response.data
  },

  // Create reply
  createReply: async (discussionId: number, data: CreateReplyRequest): Promise<DiscussionReply> => {
    const response = await axios.post(
      `${API_BASE}/api/discussions/${discussionId}/replies`,
      data,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },

  // Like discussion
  likeDiscussion: async (id: number): Promise<LikeResponse> => {
    const response = await axios.post(
      `${API_BASE}/api/discussions/${id}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },

  // Like reply
  likeReply: async (replyId: number): Promise<LikeResponse> => {
    const response = await axios.post(
      `${API_BASE}/api/replies/${replyId}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },
}

// Blog API
export const blogApi = {
  // Get articles list
  getArticles: async (filters: ArticleFilters = {}): Promise<ArticleListResponse> => {
    const params = new URLSearchParams()
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.category) params.append('category', filters.category)
    if (filters.tag) params.append('tag', filters.tag)
    if (filters.author_id) params.append('author_id', filters.author_id)

    const response = await axios.get(`${API_BASE}/api/blog?${params.toString()}`)
    return response.data
  },

  // Get trending articles
  getTrendingArticles: async (limit = 10): Promise<Article[]> => {
    const response = await axios.get(`${API_BASE}/api/blog/trending?limit=${limit}`)
    return response.data
  },

  // Get featured articles
  getFeaturedArticles: async (limit = 5): Promise<Article[]> => {
    const response = await axios.get(`${API_BASE}/api/blog/featured?limit=${limit}`)
    return response.data
  },

  // Get article detail
  getArticle: async (slugOrId: string): Promise<ArticleDetail> => {
    const response = await axios.get(`${API_BASE}/api/blog/${slugOrId}`)
    return response.data
  },

  // Create article
  createArticle: async (data: CreateArticleRequest): Promise<Article> => {
    const response = await axios.post(`${API_BASE}/api/blog`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    return response.data
  },

  // Update article
  updateArticle: async (slugOrId: string, data: UpdateArticleRequest): Promise<Article> => {
    const response = await axios.patch(`${API_BASE}/api/blog/${slugOrId}`, data, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    return response.data
  },

  // Delete article
  deleteArticle: async (slugOrId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/api/blog/${slugOrId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
  },

  // Get comments
  getComments: async (articleSlugOrId: string): Promise<ArticleComment[]> => {
    const response = await axios.get(`${API_BASE}/api/blog/${articleSlugOrId}/comments`)
    return response.data
  },

  // Create comment
  createComment: async (
    articleSlugOrId: string,
    data: CreateCommentRequest
  ): Promise<ArticleComment> => {
    const response = await axios.post(
      `${API_BASE}/api/blog/${articleSlugOrId}/comments`,
      data,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },

  // Like article
  likeArticle: async (id: number): Promise<LikeResponse> => {
    const response = await axios.post(
      `${API_BASE}/api/blog/${id}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },

  // Like comment
  likeComment: async (commentId: number): Promise<LikeResponse> => {
    const response = await axios.post(
      `${API_BASE}/api/blog/comments/${commentId}/like`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      }
    )
    return response.data
  },

  // Get categories
  getCategories: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE}/api/blog/categories`)
    return response.data
  },

  // Get popular tags
  getPopularTags: async (limit = 20): Promise<PopularTag[]> => {
    const response = await axios.get(`${API_BASE}/api/blog/tags/popular?limit=${limit}`)
    return response.data
  },
}
