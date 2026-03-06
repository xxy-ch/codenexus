import api from './api'
import { USE_MOCK_DATA } from './config'
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
    if (USE_MOCK_DATA) return getMockPosts(page, limit)

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
    if (USE_MOCK_DATA) return getMockPostDetail(id)

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
    if (USE_MOCK_DATA) {
      return {
        id: Math.random().toString(),
        ...data,
        excerpt: data.content.substring(0, 150),
        author_id: 'user1',
        author_username: 'testuser',
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        reading_time: Math.ceil(data.content.length / 200),
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    const response = await api.post('/blog', data)
    return normalizePost(response.data)
  },
}

function getMockPosts(page = 1, limit = 10) {
  const posts: BlogPost[] = [
    {
      id: '1',
      title: '动态规划完全指南：从入门到精通',
      content: '详细讲解动态规划的核心概念...',
      excerpt: '动态规划是算法竞赛中最重要的技巧之一',
      author_id: 'user1',
      author_username: 'algo_master',
      category: 'tutorial',
      tags: ['DP', '算法', '教程'],
      likes_count: 156,
      comments_count: 23,
      views_count: 2341,
      reading_time: 15,
      is_published: true,
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-01-10T00:00:00Z',
    },
    {
      id: '2',
      title: '我的ACM参赛经验分享',
      content: '参加ACM竞赛的两年经历...',
      excerpt: '分享我在ACM竞赛中的收获和感悟',
      author_id: 'user2',
      author_username: 'acm_fighter',
      category: 'experience',
      tags: ['ACM', '经验', '竞赛'],
      likes_count: 89,
      comments_count: 15,
      views_count: 1567,
      reading_time: 8,
      is_published: true,
      created_at: '2024-01-08T00:00:00Z',
      updated_at: '2024-01-08T00:00:00Z',
    },
  ]

  return {
    posts: posts.slice((page - 1) * limit, page * limit),
    total: posts.length,
    page,
    limit,
  }
}

function getMockPostDetail(id: string) {
  return {
    ...getMockPosts().posts[0],
    comments: [
      {
        id: 'c1',
        post_id: id,
        content: '非常详细的教程，收获很大！',
        author_id: 'user2',
        author_username: 'learner',
        likes_count: 12,
        created_at: '2024-01-11T00:00:00Z',
      },
    ],
  }
}
