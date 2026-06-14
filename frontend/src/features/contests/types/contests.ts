export interface Contest {
  id: string
  name: string
  description: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: 'upcoming' | 'ongoing' | 'completed'
  participants_count: number
  problems_count: number
  difficulty: 'easy' | 'medium' | 'hard'
  rules?: string
  prizes?: string
  created_at: string
}

export interface ContestProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  accepted_count: number
  submission_count: number
}

export interface ContestDetail extends Contest {
  problems: ContestProblem[]
  is_registered: boolean
}

export interface ContestRegistration {
  success: boolean
  message?: string
}

export interface ContestEntry {
  success: boolean
  message?: string
}