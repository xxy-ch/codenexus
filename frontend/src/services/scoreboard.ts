import api from './api'

export interface ScoreboardProblemSubmission {
  problem_id: number
  problem_title: string
  score: number
  attempts: number
  time_penalty: number
  first_solved_at?: string | null
}

export interface ScoreboardEntry {
  user_id: string
  username: string
  score: number
  penalty: number
  solved_count: number
  submissions: ScoreboardProblemSubmission[]
}

export const scoreboardService = {
  async getContestScoreboard(contestId: string): Promise<ScoreboardEntry[]> {
    const response = await api.get<ScoreboardEntry[]>(`/contests/${contestId}/rankings`)
    return response.data
  },
}

