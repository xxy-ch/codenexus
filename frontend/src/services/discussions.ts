import api from './api'
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
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, String(value))
    })

    const response = await api.get<DiscussionsResponse>(`/discussions?${params}`)
    return response.data
  },

  async getDiscussionDetail(id: string): Promise<DiscussionDetail> {
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
    const response = await api.post<Discussion>('/discussions', data)
    return response.data
  },

  async createReply(discussionId: string, content: string, parentId?: string): Promise<DiscussionReply> {
    const response = await api.post<DiscussionReply>(`/discussions/${discussionId}/replies`, {
      content,
      parent_id: parentId,
    })
    return response.data
  },

  async toggleLike(discussionId: string): Promise<{ liked: boolean; likes_count: number }> {
    const response = await api.post(`/discussions/${discussionId}/like`)
    return response.data
  },
}
