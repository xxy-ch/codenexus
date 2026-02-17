export interface AdminStats {
  total_users: number
  total_problems: number
  total_submissions: number
  total_contests: number
  active_users_today: number
  submissions_today: number
  pending_reports: number
  system_health: 'healthy' | 'warning' | 'error'
}

export interface UserManagement {
  id: string
  username: string
  email: string
  role: 'admin' | 'moderator' | 'user'
  organization_id?: string
  organization_name?: string
  status: 'active' | 'inactive' | 'banned'
  created_at: string
  last_login?: string
  submissions_count: number
  problems_solved: number
}

export interface ProblemManagement {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  status: 'published' | 'draft' | 'archived'
  tags: string[]
  submissions_count: number
  accepted_count: number
  author_id: string
  author_username: string
  created_at: string
  is_published: boolean
}

export interface SystemHealth {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  active_judges: number
  queue_length: number
  avg_response_time: number
}

export interface Report {
  id: string
  type: 'blog' | 'comment' | 'discussion' | 'user'
  target_id: string
  target_title?: string
  reason: 'spam' | 'inappropriate' | 'copyright' | 'other'
  description: string
  reporter_id: string
  reporter_username: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
  updated_at: string
  reviewer_id?: string
  reviewer_username?: string
  resolution_notes?: string
}