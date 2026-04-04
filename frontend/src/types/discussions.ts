export interface Discussion {
  id: string
  title: string
  content: string
  author_id: string
  author_name: string
  author_avatar?: string
  tags: string[]
  replies: number
  views: number
  created_at: string
  updated_at: string
}

export interface DiscussionComment {
  id: string
  discussion_id: string
  author_id: string
  author_name: string
  author_avatar?: string
  content: string
  created_at: string
}
