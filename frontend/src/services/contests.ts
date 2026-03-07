import api from './api'
import type { Contest, ContestDetail, ContestRegistration, ContestEntry } from '@/types/contests'

export interface ContestFilters {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'all'
  difficulty?: 'easy' | 'medium' | 'hard' | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface ContestsResponse {
  contests: Contest[]
  total: number
}

export const contestsService = {
  /**
   * 获取竞赛列表
   */
  async getContests(filters: ContestFilters = {}): Promise<ContestsResponse> {
    const params = new URLSearchParams()

    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status)
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      params.append('difficulty', filters.difficulty)
    }
    if (filters.search) {
      params.append('search', filters.search)
    }
    if (filters.page) {
      params.append('page', filters.page.toString())
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString())
    }

    try {
      const response = await api.get<ContestsResponse>(`/contests?${params}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch contests:', error)
      throw error
    }
  },

  /**
   * 获取竞赛详情
   */
  async getContestDetail(contestId: string): Promise<ContestDetail> {
    try {
      const response = await api.get<ContestDetail>(`/contests/${contestId}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch contest detail:', error)
      throw error
    }
  },

  /**
   * 注册竞赛
   */
  async registerContest(contestId: string): Promise<ContestRegistration> {
    try {
      await api.post(`/contests/${contestId}/register`)
      return { success: true, message: 'Registration successful' }
    } catch (error) {
      console.error('Failed to register contest:', error)
      throw error
    }
  },

  /**
   * 进入竞赛
   */
  async enterContest(contestId: string): Promise<ContestEntry> {
    try {
      const response = await api.get<{ status?: string }>(`/contests/${contestId}/status`)
      const rawStatus = String(response.data?.status || '').toLowerCase()
      const isActive = ['active', 'ongoing', 'running'].includes(rawStatus)

      if (!isActive) {
        throw new Error(`Contest is not active (status: ${rawStatus || 'unknown'})`)
      }

      return { success: true, message: 'Entered contest successfully' }
    } catch (error) {
      console.error('Failed to enter contest:', error)
      throw error
    }
  },
}
