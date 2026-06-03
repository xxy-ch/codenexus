import api from '@/lib/api'
import type { RankingEntry } from '@/types/ranking'

export const rankingService = {
  global: async (params: { page?: number; limit?: number } = {}): Promise<{ entries: RankingEntry[]; total: number }> => {
    const res = await api.get('/leaderboard/global', { params })
    return res.data
  },

  school: async (schoolId: string): Promise<{ entries: RankingEntry[] }> => {
    const res = await api.get(`/leaderboard/school/${schoolId}`)
    return res.data
  },

  userStats: async (userId: string) => {
    const res = await api.get(`/leaderboard/user/${userId}/stats`)
    return res.data
  },
}
