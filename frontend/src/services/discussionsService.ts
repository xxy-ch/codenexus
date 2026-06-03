import api from '@/lib/api'
import type { Discussion, DiscussionComment } from '@/types/discussions'

export const discussionsService = {
  list: async (params: { page?: number; limit?: number; tag?: string; sort?: string } = {}) => {
    const res = await api.get('/discussions', { params })
    return res.data
  },

  get: async (id: string): Promise<Discussion> => {
    const res = await api.get<Discussion>(`/discussions/${id}`)
    return res.data
  },

  create: async (data: { title: string; content: string; tags: string[] }) => {
    const res = await api.post('/discussions', data)
    return res.data
  },

  getReplies: async (id: string): Promise<DiscussionComment[]> => {
    const res = await api.get<DiscussionComment[]>(`/discussions/${id}/replies`)
    return res.data
  },

  addReply: async (id: string, content: string) => {
    const res = await api.post(`/discussions/${id}/replies`, { content })
    return res.data
  },

  like: async (id: string) => {
    const res = await api.post(`/discussions/${id}/like`)
    return res.data
  },
}
