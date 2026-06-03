import api from '@/lib/api'
import type { Contest, ContestRankEntry } from '@/types/contests'

export interface ListContestsQuery {
  page?: number
  limit?: number
  status?: string
}

export const contestsService = {
  list: async (params: ListContestsQuery = {}) => {
    const res = await api.get('/contests', { params })
    return res.data
  },

  get: async (id: string): Promise<Contest> => {
    const res = await api.get<Contest>(`/contests/${id}`)
    return res.data
  },

  create: async (data: Partial<Contest>): Promise<Contest> => {
    const res = await api.post<Contest>('/contests', data)
    return res.data
  },

  update: async (id: string, data: Partial<Contest>): Promise<Contest> => {
    const res = await api.put<Contest>(`/contests/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contests/${id}`)
  },

  register: async (id: string) => {
    const res = await api.post(`/contests/${id}/register`)
    return res.data
  },

  getRankings: async (id: string): Promise<ContestRankEntry[]> => {
    const res = await api.get<ContestRankEntry[]>(`/contests/${id}/rankings`)
    return res.data
  },

  getProblems: async (id: string) => {
    const res = await api.get(`/contests/${id}/problems`)
    return res.data
  },

  getParticipants: async (id: string) => {
    const res = await api.get(`/contests/${id}/participants`)
    return res.data
  },

  getStatus: async (id: string) => {
    const res = await api.get(`/contests/${id}/status`)
    return res.data
  },
}
