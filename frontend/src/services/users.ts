import api from './api'
import type { UserStats, UserActivity, RecommendedProblem } from '@/types/users'

// 开发模式下使用模拟数据的标志
const USE_MOCK_DATA = true // 临时启用模拟数据用于演示

export const usersService = {
  /**
   * 获取用户统计信息
   */
  async getUserStats(): Promise<UserStats> {
    if (USE_MOCK_DATA) {
      return getMockUserStats()
    }

    try {
      const response = await api.get<UserStats>('/users/stats')
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockUserStats()
    }
  },

  /**
   * 获取用户活动记录
   */
  async getUserActivity(limit: number = 10): Promise<UserActivity[]> {
    if (USE_MOCK_DATA) {
      return getMockUserActivity().slice(0, limit)
    }

    try {
      const response = await api.get<UserActivity[]>(`/users/activity?limit=${limit}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockUserActivity().slice(0, limit)
    }
  },

  /**
   * 获取推荐题目
   */
  async getRecommendedProblems(limit: number = 5): Promise<RecommendedProblem[]> {
    if (USE_MOCK_DATA) {
      return getMockRecommendedProblems().slice(0, limit)
    }

    try {
      const response = await api.get<RecommendedProblem[]>(`/users/recommended-problems?limit=${limit}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockRecommendedProblems().slice(0, limit)
    }
  },
}

// 模拟数据
function getMockUserStats(): UserStats {
  return {
    total_submissions: 150,
    accepted_submissions: 75,
    unique_problems_solved: 45,
    current_streak: 7,
    longest_streak: 14,
    ranking: 128,
    total_points: 1250,
    easy_solved: 20,
    medium_solved: 18,
    hard_solved: 7,
    accuracy_rate: 50,
    total_achievements: 10,
    unlocked_achievements: 3,
    achievements: [
      {
        id: 'first_solve',
        name: '初出茅庐',
        description: '解决第一道题',
        icon: 'star',
        unlocked_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'streak_7',
        name: '坚持不懈',
        description: '连续学习7天',
        icon: 'local_fire_department',
        unlocked_at: '2024-01-12T00:00:00Z',
      },
      {
        id: 'perfect_10',
        name: '完美十题',
        description: '连续解决10道题',
        icon: 'military_tech',
        unlocked_at: '2024-01-10T00:00:00Z',
      },
    ],
  }
}

function getMockUserActivity(): UserActivity[] {
  return [
    {
      id: '1',
      type: 'submission',
      problem_id: '1',
      problem_title: 'Two Sum',
      status: 'accepted',
      language: 'cpp',
      created_at: '2024-01-12T10:30:00Z',
    },
    {
      id: '2',
      type: 'contest_registration',
      contest_id: '1',
      contest_name: 'Weekly Contest 345',
      created_at: '2024-01-12T09:00:00Z',
    },
    {
      id: '3',
      type: 'submission',
      problem_id: '2',
      problem_title: 'Add Two Numbers',
      status: 'wrong_answer',
      language: 'python',
      created_at: '2024-01-11T15:20:00Z',
    },
    {
      id: '4',
      type: 'achievement',
      achievement_id: 'streak_7',
      achievement_name: '坚持不懈',
      created_at: '2024-01-12T08:00:00Z',
    },
    {
      id: '5',
      type: 'submission',
      problem_id: '3',
      problem_title: 'Longest Substring Without Repeating Characters',
      status: 'accepted',
      language: 'javascript',
      created_at: '2024-01-11T14:00:00Z',
    },
    {
      id: '6',
      type: 'submission',
      problem_id: '4',
      problem_title: 'Median of Two Sorted Arrays',
      status: 'time_limit_exceeded',
      language: 'java',
      created_at: '2024-01-10T16:45:00Z',
    },
    {
      id: '7',
      type: 'submission',
      problem_id: '5',
      problem_title: 'Reverse Linked List',
      status: 'accepted',
      language: 'rust',
      created_at: '2024-01-10T10:30:00Z',
    },
  ]
}

function getMockRecommendedProblems(): RecommendedProblem[] {
  return [
    {
      id: '6',
      title: 'Merge Intervals',
      difficulty: 'medium',
      tags: ['Array', 'Sorting'],
      points: 25,
      acceptance_rate: 45,
      reason: 'based on your recent activity with array problems',
    },
    {
      id: '7',
      title: 'Valid Parentheses',
      difficulty: 'easy',
      tags: ['Stack', 'String'],
      points: 15,
      acceptance_rate: 68,
      reason: 'good next step after solving linked list problems',
    },
    {
      id: '8',
      title: 'Binary Tree Level Order Traversal',
      difficulty: 'medium',
      tags: ['Tree', 'BFS'],
      points: 30,
      acceptance_rate: 52,
      reason: 'popular problem that matches your skill level',
    },
    {
      id: '9',
      title: 'Climbing Stairs',
      difficulty: 'easy',
      tags: ['Dynamic Programming'],
      points: 10,
      acceptance_rate: 72,
      reason: 'introduction to dynamic programming',
    },
    {
      id: '10',
      title: 'Kth Largest Element in an Array',
      difficulty: 'medium',
      tags: ['Array', 'Heap'],
      points: 20,
      acceptance_rate: 48,
      reason: 'practicing advanced array techniques',
    },
  ]
}