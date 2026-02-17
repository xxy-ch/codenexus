import api from './api'
import type { BlogPost, BlogComment } from '@/types/blog'

const USE_MOCK_DATA = true

export const blogService = {
  async getPosts(page = 1, limit = 10) {
    if (USE_MOCK_DATA) return getMockPosts(page, limit)

    const response = await api.get(`/blog/posts?page=${page}&limit=${limit}`)
    return response.data
  },

  async getPostDetail(id: string) {
    if (USE_MOCK_DATA) return getMockPostDetail(id)

    const response = await api.get(`/blog/posts/${id}`)
    return response.data
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

    const response = await api.post('/blog/posts', data)
    return response.data
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