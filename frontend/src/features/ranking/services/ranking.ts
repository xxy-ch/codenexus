import api from '@/shared/services/api'
import type { RankingResponse, RankingFilters } from '@/features/ranking/types/ranking'

type LeaderboardPayload = {
  entries?: Array<{
    user_id?: string
    username?: string
    rank?: number
    score?: number
    problems_solved?: number
    submissions?: number
    acceptance_rate?: number
    organization_id?: number | null
    campus_id?: number | null
  }>
  total?: number
  limit?: number
  offset?: number
}

function buildQuery(filters: RankingFilters): string {
  const params = new URLSearchParams()

  const limit = filters.limit ?? 20
  const page = Math.max(filters.page ?? 1, 1)
  params.set('limit', String(limit))
  params.set('offset', String((page - 1) * limit))

  if (filters.time_period && filters.time_period !== 'all') {
    params.set('timeframe', filters.time_period)
  }

  return params.toString()
}

function mapLeaderboardResponse(payload: LeaderboardPayload, filters: RankingFilters): RankingResponse {
  const entries = Array.isArray(payload?.entries) ? payload.entries : []
  const limit = Number(payload?.limit ?? filters.limit ?? 20)
  const offset = Number(payload?.offset ?? 0)
  const page = Math.floor(offset / Math.max(limit, 1)) + 1

  return {
    users: entries.map((entry) => ({
      id: String(entry.user_id ?? ''),
      username: String(entry.username ?? ''),
      email: '',
      first_name: '',
      last_name: '',
      ranking: Number(entry.rank ?? 0),
      points: Number(entry.score ?? 0),
      problems_solved: Number(entry.problems_solved ?? 0),
      submissions: Number(entry.submissions ?? 0),
      accuracy: Number(entry.acceptance_rate ?? 0),
      school_id: entry.organization_id != null ? String(entry.organization_id) : undefined,
      school_name:
        entry.organization_id != null ? `组织 ${entry.organization_id}` : undefined,
      avatar: null,
      created_at: '',
    })),
    total: Number(payload?.total ?? entries.length),
    page,
    limit,
  }
}

export const rankingService = {
  async getGlobalRanking(filters: RankingFilters = {}): Promise<RankingResponse> {
    const query = buildQuery(filters)
    const response = await api.get<LeaderboardPayload>(`/leaderboard/global?${query}`)
    const mapped = mapLeaderboardResponse(response.data, filters)

    if (filters.school_id) {
      const users = mapped.users.filter((user) => user.school_id === filters.school_id)
      return {
        ...mapped,
        users,
        total: users.length,
      }
    }

    return mapped
  },

  async getOrganizationRanking(filters: RankingFilters = {}): Promise<RankingResponse> {
    const query = buildQuery(filters)
    const schoolId = filters.school_id || '1'
    const response = await api.get<LeaderboardPayload>(`/leaderboard/school/${schoolId}?${query}`)
    return mapLeaderboardResponse(response.data, filters)
  },

  async searchUsers(query: string): Promise<RankingResponse> {
    const trimmed = query.trim().toLowerCase()
    const response = await api.get<LeaderboardPayload>('/leaderboard/global?limit=100')
    const mapped = mapLeaderboardResponse(response.data, { page: 1, limit: 100 })

    const users = mapped.users.filter((user) => user.username.toLowerCase().includes(trimmed))
    return {
      ...mapped,
      users,
      total: users.length,
    }
  },
}
