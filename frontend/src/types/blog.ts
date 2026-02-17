export interface BlogPost {
  id: string
  title: string
  content: string
  excerpt: string
  cover_image?: string
  author_id: string
  author_username: string
  author_avatar?: string
  category: 'tutorial' | 'experience' | 'solution' | 'news'
  tags: string[]
  problem_id?: string
  problem_title?: string
  likes_count: number
  comments_count: number
  views_count: number
  reading_time: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface BlogComment {
  id: string
  post_id: string
  content: string
  author_id: string
  author_username: string
  likes_count: number
  created_at: string
}