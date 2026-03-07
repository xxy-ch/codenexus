import api from './api'
import type { BlogPost, BlogComment } from '@/types/blog'

function calculateReadingTime(text: string) {
  return Math.max(1, Math.ceil((text || '').length / 200))
}

function normalizePost(data: any): BlogPost {
  const content = String(data?.content || '')
  const excerpt = String(data?.excerpt || data?.summary || content.slice(0, 150))

  return {
    id: String(data?.id || ''),
    title: String(data?.title || ''),
    content,
    excerpt,
    cover_image: data?.cover_image ? String(data.cover_image) : undefined,
    author_id: String(data?.author_id || ''),
    author_username: String(data?.author_username || 'unknown'),
    author_avatar: data?.author_avatar ? String(data.author_avatar) : undefined,
    category: (data?.category || 'tutorial') as BlogPost['category'],
    tags: Array.isArray(data?.tags) ? data.tags.map((tag: unknown) => String(tag)) : [],
    problem_id: data?.problem_id ? String(data.problem_id) : undefined,
    problem_title: data?.problem_title ? String(data.problem_title) : undefined,
    likes_count: Number(data?.like_count ?? data?.likes_count) || 0,
    comments_count: Number(data?.comment_count ?? data?.comments_count) || 0,
    views_count: Number(data?.view_count ?? data?.views_count) || 0,
    reading_time: Number(data?.reading_time) || calculateReadingTime(content),
    is_published: Boolean(data?.is_published),
    created_at: String(data?.created_at || new Date().toISOString()),
    updated_at: String(data?.updated_at || new Date().toISOString()),
  }
}

export const blogService = {
  async getPosts(page = 1, limit = 10) {
    const response = await api.get(`/blog?page=${page}&limit=${limit}`)
    const payload = response.data || {}
    const posts = Array.isArray(payload.articles) ? payload.articles.map((post: any) => normalizePost(post)) : []

    return {
      posts,
      total: Number(payload.total) || 0,
      page: Number(payload.page) || page,
      limit: Number(payload.limit) || limit,
    }
  },

  async getPostDetail(id: string) {
    const response = await api.get(`/blog/${id}`)
    const payload = response.data || {}

    return {
      ...normalizePost(payload.article),
      comments: Array.isArray(payload.comments)
        ? payload.comments.map((comment: any) => ({
            id: String(comment?.id || ''),
            post_id: String(comment?.article_id || id),
            content: String(comment?.content || ''),
            author_id: String(comment?.author_id || ''),
            author_username: String(comment?.author_username || 'unknown'),
            likes_count: Number(comment?.like_count ?? comment?.likes_count) || 0,
            created_at: String(comment?.created_at || new Date().toISOString()),
          } as BlogComment))
        : [],
    }
  },

  async createPost(data: {
    title: string
    content: string
    category: string
    tags: string[]
    problem_id?: string
  }) {
    const response = await api.post('/blog', data)
    return normalizePost(response.data)
  },
}
