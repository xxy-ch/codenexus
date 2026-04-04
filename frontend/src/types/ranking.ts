export interface RankingEntry {
  rank: number
  user_id: string
  username: string
  avatar?: string
  rating: number
  solved: number
  submissions: number
  acceptance_rate: number
  organization?: string
}
