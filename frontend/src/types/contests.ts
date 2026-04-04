export interface Contest {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  status: 'not_started' | 'running' | 'ended'
  problems: string[]
  participants: number
  created_by: string
  created_at: string
}

export interface ContestProblem {
  problem_id: string
  problem_title: string
  problem_label: string
  points: number
}

export interface ContestSubmission {
  id: string
  contest_id: string
  problem_id: string
  user_id: string
  code: string
  language: string
  status: string
  time_ms?: number
  memory_kb?: number
  submitted_at: string
}

export interface ContestRankEntry {
  user_id: string
  username: string
  avatar?: string
  rank: number
  score: number
  solved: number
  penalty: number
  problem_stats: Record<string, { status: string; attempts: number; time?: number }>
}
