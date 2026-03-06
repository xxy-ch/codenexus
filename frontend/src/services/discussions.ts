import api from './api'
import { USE_MOCK_DATA } from './config'
import type { Discussion, DiscussionDetail, DiscussionReply } from '@/types/discussions'

export interface DiscussionFilters {
  category?: string
  problem_id?: string
  search?: string
  page?: number
  limit?: number
  sort?: 'recent' | 'popular' | 'most_liked'
}

export interface DiscussionsResponse {
  discussions: Discussion[]
  total: number
  page: number
  limit: number
}

export const discussionsService = {
  async getDiscussions(filters: DiscussionFilters = {}): Promise<DiscussionsResponse> {
    if (USE_MOCK_DATA) return getMockDiscussions(filters)

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value))
    })

    const response = await api.get<DiscussionsResponse>(`/discussions?${params}`)
    return response.data
  },

  async getDiscussionDetail(id: string): Promise<DiscussionDetail> {
    if (USE_MOCK_DATA) return getMockDiscussionDetail(id)

    const response = await api.get<DiscussionDetail>(`/discussions/${id}`)
    return response.data
  },

  async createDiscussion(data: {
    title: string
    content: string
    category: string
    problem_id?: string
    tags: string[]
  }): Promise<Discussion> {
    if (USE_MOCK_DATA) {
      const newDiscussion: Discussion = {
        id: Math.random().toString(),
        title: data.title,
        content: data.content,
        author_id: 'current_user',
        author_username: 'testuser',
        category: data.category as any,
        tags: data.tags,
        likes_count: 0,
        replies_count: 0,
        views_count: 0,
        is_pinned: false,
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return newDiscussion
    }

    const response = await api.post<Discussion>('/discussions', data)
    return response.data
  },

  async createReply(discussionId: string, content: string, parentId?: string): Promise<DiscussionReply> {
    if (USE_MOCK_DATA) {
      const newReply: DiscussionReply = {
        id: Math.random().toString(),
        discussion_id: discussionId,
        parent_id: parentId,
        content,
        author_id: 'current_user',
        author_username: 'testuser',
        likes_count: 0,
        is_best_answer: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return newReply
    }

    const response = await api.post<DiscussionReply>(`/discussions/${discussionId}/replies`, {
      content,
      parent_id: parentId,
    })
    return response.data
  },

  async toggleLike(discussionId: string): Promise<{ liked: boolean; likes_count: number }> {
    if (USE_MOCK_DATA) {
      return { liked: true, likes_count: 42 }
    }

    const response = await api.post(`/discussions/${discussionId}/like`)
    return response.data
  },
}

function getMockDiscussions(_filters: DiscussionFilters): DiscussionsResponse {
  const discussions: Discussion[] = [
    {
      id: '1',
      title: '如何优化 Two Sum 的解法？',
      content: '我目前用的是暴力解法O(n²)，有什么更好的方法吗？',
      author_id: 'user1',
      author_username: 'code_beginner',
      category: 'question',
      tags: ['算法', '数组', '优化'],
      likes_count: 15,
      replies_count: 8,
      views_count: 234,
      is_pinned: true,
      is_locked: false,
      problem_id: '1',
      problem_title: 'Two Sum',
      created_at: '2024-01-12T10:00:00Z',
      updated_at: '2024-01-12T15:30:00Z',
    },
    {
      id: '2',
      title: '分享我的动态规划解题思路',
      content: '详细讲解如何用DP解决背包问题...',
      author_id: 'user2',
      author_username: 'algo_master',
      category: 'solution',
      tags: ['动态规划', '教程'],
      likes_count: 42,
      replies_count: 12,
      views_count: 567,
      is_pinned: false,
      is_locked: false,
      created_at: '2024-01-11T08:00:00Z',
      updated_at: '2024-01-11T20:00:00Z',
    },
    {
      id: '3',
      title: 'Python中递归深度超限问题',
      content: '在解决递归问题时遇到RecursionError',
      author_id: 'user3',
      author_username: 'python_lover',
      category: 'bug_report',
      tags: ['Python', '递归'],
      likes_count: 8,
      replies_count: 5,
      views_count: 123,
      is_pinned: false,
      is_locked: false,
      created_at: '2024-01-10T14:00:00Z',
      updated_at: '2024-01-10T18:00:00Z',
    },
  ]

  return {
    discussions,
    total: discussions.length,
    page: 1,
    limit: 20,
  }
}

function getMockDiscussionDetail(id: string): DiscussionDetail {
  return {
    ...getMockDiscussions({}).discussions[0],
    replies: [
      {
        id: 'r1',
        discussion_id: id,
        content: '可以使用哈希表优化到O(n)时间复杂度',
        author_id: 'user2',
        author_username: 'helper',
        likes_count: 12,
        is_best_answer: true,
        created_at: '2024-01-12T11:00:00Z',
        updated_at: '2024-01-12T11:00:00Z',
      },
    ],
    is_liked: false,
    can_edit: false,
    can_delete: false,
  }
}
