import api from './api'
import type { Contest, ContestDetail, ContestRegistration, ContestEntry } from '@/types/contests'

// 开发模式下使用模拟数据的标志
const USE_MOCK_DATA = true // 临时启用模拟数据用于演示

export interface ContestFilters {
  status?: 'upcoming' | 'ongoing' | 'completed' | 'all'
  difficulty?: 'easy' | 'medium' | 'hard' | 'all'
  search?: string
  page?: number
  limit?: number
}

export interface ContestsResponse {
  contests: Contest[]
  total: number
}

export const contestsService = {
  /**
   * 获取竞赛列表
   */
  async getContests(filters: ContestFilters = {}): Promise<ContestsResponse> {
    if (USE_MOCK_DATA) {
      return getMockContests(filters)
    }

    const params = new URLSearchParams()

    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status)
    }
    if (filters.difficulty && filters.difficulty !== 'all') {
      params.append('difficulty', filters.difficulty)
    }
    if (filters.search) {
      params.append('search', filters.search)
    }
    if (filters.page) {
      params.append('page', filters.page.toString())
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString())
    }

    try {
      const response = await api.get<ContestsResponse>(`/contests?${params}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockContests(filters)
    }
  },

  /**
   * 获取竞赛详情
   */
  async getContestDetail(contestId: string): Promise<ContestDetail> {
    if (USE_MOCK_DATA) {
      return getMockContestDetail(contestId)
    }

    try {
      const response = await api.get<ContestDetail>(`/contests/${contestId}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockContestDetail(contestId)
    }
  },

  /**
   * 注册竞赛
   */
  async registerContest(contestId: string): Promise<ContestRegistration> {
    if (USE_MOCK_DATA) {
      return { success: true, message: 'Registration successful' }
    }

    try {
      const response = await api.post<ContestRegistration>(`/contests/${contestId}/register`)
      return response.data
    } catch (error) {
      return { success: false, message: 'Registration failed' }
    }
  },

  /**
   * 进入竞赛
   */
  async enterContest(contestId: string): Promise<ContestEntry> {
    if (USE_MOCK_DATA) {
      return { success: true, message: 'Entered contest successfully' }
    }

    try {
      const response = await api.post<ContestEntry>(`/contests/${contestId}/enter`)
      return response.data
    } catch (error) {
      return { success: false, message: 'Failed to enter contest' }
    }
  },
}

// 模拟数据
const mockContests: Contest[] = [
  {
    id: '1',
    name: 'Weekly Contest 345',
    description: 'Join us for our weekly coding challenge! Test your skills with 4 exciting problems.',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    duration_minutes: 120,
    status: 'upcoming',
    participants_count: 45,
    problems_count: 4,
    difficulty: 'medium',
    created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: '2',
    name: 'Algorithm Marathon',
    description: 'A challenging 4-hour contest featuring complex algorithmic problems.',
    start_time: '2024-01-10T10:00:00Z',
    end_time: '2024-01-10T14:00:00Z',
    duration_minutes: 240,
    status: 'ongoing',
    participants_count: 128,
    problems_count: 6,
    difficulty: 'hard',
    created_at: '2024-01-05T00:00:00Z',
  },
  {
    id: '3',
    name: 'Beginner Friendly Contest',
    description: 'Perfect for newcomers to practice and improve their coding skills.',
    start_time: '2024-01-05T10:00:00Z',
    end_time: '2024-01-05T11:30:00Z',
    duration_minutes: 90,
    status: 'completed',
    participants_count: 256,
    problems_count: 3,
    difficulty: 'easy',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Daily Warm-up',
    description: 'Start your day with some coding exercises!',
    start_time: '2024-01-20T08:00:00Z',
    end_time: '2024-01-20T09:00:00Z',
    duration_minutes: 60,
    status: 'upcoming',
    participants_count: 32,
    problems_count: 2,
    difficulty: 'easy',
    created_at: '2024-01-12T00:00:00Z',
  },
  {
    id: '5',
    name: 'Hardcore Challenge',
    description: 'Only for the brave! Extremely difficult problems.',
    start_time: '2024-01-08T10:00:00Z',
    end_time: '2024-01-08T12:00:00Z',
    duration_minutes: 120,
    status: 'completed',
    participants_count: 64,
    problems_count: 5,
    difficulty: 'hard',
    created_at: '2024-01-01T00:00:00Z',
  },
]

function getMockContests(filters: ContestFilters): ContestsResponse {
  let filtered = [...mockContests]

  // 按状态过滤
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(c => c.status === filters.status)
  }

  // 按难度过滤
  if (filters.difficulty && filters.difficulty !== 'all') {
    filtered = filtered.filter(c => c.difficulty === filters.difficulty)
  }

  // 搜索
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower)
    )
  }

  return {
    contests: filtered,
    total: filtered.length,
  }
}

function getMockContestDetail(contestId: string): ContestDetail {
  const contest = mockContests.find(c => c.id === contestId)
  if (!contest) {
    throw new Error('Contest not found')
  }

  return {
    ...contest,
    rules: `- No cheating or plagiarizing code\n- No external help or AI assistance\n- Time limit: ${contest.duration_minutes} minutes\n- All submissions are final`,
    prizes: contest.difficulty === 'hard'
      ? '1st: $500, 2nd: $250, 3rd: $100'
      : contest.difficulty === 'medium'
      ? '1st: $200, 2nd: $100, 3rd: $50'
      : '1st: $100, 2nd: $50, 3rd: $25',
    problems: [
      {
        id: '1',
        title: 'Two Sum',
        difficulty: 'easy',
        points: 10,
        accepted_count: 120,
        submission_count: 150,
      },
      {
        id: '2',
        title: 'Add Two Numbers',
        difficulty: 'medium',
        points: 20,
        accepted_count: 45,
        submission_count: 80,
      },
      {
        id: '3',
        title: 'Longest Substring Without Repeating Characters',
        difficulty: 'medium',
        points: 25,
        accepted_count: 30,
        submission_count: 60,
      },
      {
        id: '4',
        title: 'Median of Two Sorted Arrays',
        difficulty: 'hard',
        points: 40,
        accepted_count: 8,
        submission_count: 40,
      },
    ].slice(0, contest.problems_count),
    is_registered: false,
  }
}