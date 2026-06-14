import api from '@/shared/services/api'
import type { UserStats, UserActivity, RecommendedProblem } from '@/types/users'

export interface UserProfile {
  id: string
  username: string
  email?: string | null
  display_name?: string | null
  organization_id: number
  campus_id?: number | null
  role: string
  created_at: string
  updated_at: string
}

export interface UserProfileUpdatePayload {
  email?: string
  password?: string
  display_name?: string
  campus_id?: number
}

export const usersService = {
  async getMyProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>('/users/me')
    return response.data
  },

  async updateMyProfile(payload: UserProfileUpdatePayload): Promise<UserProfile> {
    const response = await api.patch<UserProfile>('/users/me', payload)
    return response.data
  },

  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const meResponse = await api.get('/users/me')
      const userId = meResponse.data?.id

      if (!userId) {
        throw new Error('Missing user id from /users/me')
      }

      const [leaderboardStatsResponse, submissionStatsResponse] = await Promise.all([
        api.get(`/leaderboard/user/${userId}/stats`),
        api.get('/submissions/stats'),
      ])
      const leaderboardStats = leaderboardStatsResponse.data
      const submissionStats = submissionStatsResponse.data

      return {
        total_submissions: Number(submissionStats.total_submissions ?? 0),
        accepted_submissions: Number(submissionStats.accepted_submissions ?? 0),
        unique_problems_solved: Number(leaderboardStats.total_problems_solved ?? 0),
        current_streak: Number(leaderboardStats.streak_days ?? 0),
        longest_streak: Number(leaderboardStats.max_streak_days ?? 0),
        ranking: Number(leaderboardStats.global_rank ?? 0),
        total_points: Number(leaderboardStats.total_problems_solved ?? 0),
        easy_solved: 0,
        medium_solved: 0,
        hard_solved: 0,
        accuracy_rate: Number(submissionStats.acceptance_rate ?? 0),
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
      throw error
    }
  },

  /**
   * 获取用户活动记录
   */
  async getUserActivity(limit: number = 10): Promise<UserActivity[]> {
    try {
      const response = await api.get(`/submissions?limit=${limit}`)
      const submissions = Array.isArray(response.data?.submissions)
        ? response.data.submissions
        : []

      return submissions.map((submission: any) => ({
        id: String(submission.id),
        type: 'submission' as const,
        problem_id: String(submission.problem_id),
        problem_title: submission.problem_title ?? `Problem #${submission.problem_id}`,
        status: submission.status,
        language: submission.language,
        created_at: submission.created_at,
      }))
    } catch (error) {
      console.error('Failed to fetch user activity:', error)
      throw error
    }
  },

  /**
   * 获取推荐题目
   */
  async getRecommendedProblems(limit: number = 5): Promise<RecommendedProblem[]> {
    try {
      const response = await api.get(`/problems?limit=${limit}`)
      const problems = Array.isArray(response.data?.problems) ? response.data.problems : []

      return problems.slice(0, limit).map((problem: any) => ({
        id: String(problem.id),
        title: String(problem.title ?? ''),
        difficulty: (problem.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard',
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        points: Number(problem.points ?? 0),
        acceptance_rate: Number(problem.acceptance_rate ?? 0),
        reason: '基于当前学习进度推荐',
      }))
    } catch (error) {
      console.error('Failed to fetch recommended problems:', error)
      throw error
    }
  },
}
