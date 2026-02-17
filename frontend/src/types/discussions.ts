export interface Discussion {
  id: string
  title: string
  content: string
  author_id: string
  author_username: string
  author_avatar?: string | null
  problem_id?: string
  problem_title?: string
  category: 'question' | 'solution' | 'general' | 'bug_report'
  tags: string[]
  likes_count: number
  replies_count: number
  views_count: number
  is_pinned: boolean
  is_locked: boolean
  created_at: string
  updated_at: string
}

export interface DiscussionReply {
  id: string
  discussion_id: string
  parent_id?: string
  content: string
  author_id: string
  author_username: string
  author_avatar?: string | null
  likes_count: number
  is_best_answer: boolean
  created_at: string
  updated_at: string
}

export interface DiscussionDetail extends Discussion {
  replies: DiscussionReply[]
  is_liked: boolean
  can_edit: boolean
  can_delete: boolean
}