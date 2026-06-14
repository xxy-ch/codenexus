export interface RankingUser {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  ranking: number
  points: number
  problems_solved: number
  submissions: number
  accuracy: number
  school_id?: string
  school_name?: string
  avatar?: string | null
  created_at: string
}

export interface RankingResponse {
  users: RankingUser[]
  total: number
  page: number
  limit: number
}

export interface RankingFilters {
  page?: number
  limit?: number
  school_id?: string
  time_period?: 'all' | 'week' | 'month' | 'year'
}