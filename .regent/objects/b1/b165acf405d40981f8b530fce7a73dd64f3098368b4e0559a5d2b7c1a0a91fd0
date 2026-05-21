export interface UserStats {
  total_submissions: number
  accepted_submissions: number
  unique_problems_solved: number
  current_streak: number
  longest_streak: number
  ranking: number
  total_points: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  accuracy_rate: number
  total_achievements?: number
  unlocked_achievements?: number
  achievements?: Achievement[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked_at?: string
}

export interface UserActivity {
  id: string
  type: 'submission' | 'contest_registration' | 'achievement' | 'comment'
  problem_id?: string
  problem_title?: string
  contest_id?: string
  contest_name?: string
  achievement_id?: string
  achievement_name?: string
  status?: string
  language?: string
  created_at: string
}

export interface RecommendedProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  points: number
  acceptance_rate: number
  reason: string
}