import api from './api'
import type { RankingResponse, RankingFilters, RankingUser } from '@/types/ranking'

// 开发模式下使用模拟数据的标志
const USE_MOCK_DATA = true // 临时启用模拟数据用于演示

export const rankingService = {
  /**
   * 获取全局排行榜
   */
  async getGlobalRanking(filters: RankingFilters = {}): Promise<RankingResponse> {
    if (USE_MOCK_DATA) {
      return getMockGlobalRanking(filters)
    }

    const params = new URLSearchParams()

    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.school_id) params.append('school_id', filters.school_id)
    if (filters.time_period && filters.time_period !== 'all') {
      params.append('time_period', filters.time_period)
    }

    try {
      const response = await api.get<RankingResponse>(`/ranking?${params}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockGlobalRanking(filters)
    }
  },

  /**
   * 获取组织排行榜
   */
  async getOrganizationRanking(filters: RankingFilters = {}): Promise<RankingResponse> {
    if (USE_MOCK_DATA) {
      return getMockOrganizationRanking(filters)
    }

    const params = new URLSearchParams()

    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.school_id) params.append('school_id', filters.school_id)
    if (filters.time_period && filters.time_period !== 'all') {
      params.append('time_period', filters.time_period)
    }

    try {
      const response = await api.get<RankingResponse>(`/ranking/organizations?${params}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockOrganizationRanking(filters)
    }
  },

  /**
   * 搜索用户
   */
  async searchUsers(query: string): Promise<RankingResponse> {
    if (USE_MOCK_DATA) {
      return getMockSearchUsers(query)
    }

    try {
      const response = await api.get<RankingResponse>(`/users/search?q=${encodeURIComponent(query)}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      return getMockSearchUsers(query)
    }
  },
}

// 模拟数据
function getMockGlobalRanking(filters: RankingFilters): RankingResponse {
  const allUsers: RankingUser[] = [
    {
      id: '1',
      username: 'algorithm_master',
      email: 'master@example.com',
      first_name: 'John',
      last_name: 'Doe',
      ranking: 1,
      points: 5420,
      problems_solved: 156,
      submissions: 342,
      accuracy: 45.6,
      school_id: '1',
      school_name: 'MIT',
      avatar: null,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      username: 'code_ninja',
      email: 'ninja@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      ranking: 2,
      points: 4890,
      problems_solved: 142,
      submissions: 298,
      accuracy: 47.7,
      school_id: '2',
      school_name: 'Stanford',
      avatar: null,
      created_at: '2023-01-15T00:00:00Z',
    },
    {
      id: '3',
      username: 'bug_hunter',
      email: 'hunter@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
      ranking: 3,
      points: 4230,
      problems_solved: 128,
      submissions: 267,
      accuracy: 47.9,
      school_id: '3',
      school_name: 'Harvard',
      avatar: null,
      created_at: '2023-02-01T00:00:00Z',
    },
    {
      id: '4',
      username: 'pixel_warrior',
      email: 'pixel@example.com',
      first_name: 'Alice',
      last_name: 'Williams',
      ranking: 4,
      points: 3870,
      problems_solved: 118,
      submissions: 245,
      accuracy: 48.2,
      school_id: '4',
      school_name: 'CMU',
      avatar: null,
      created_at: '2023-02-15T00:00:00Z',
    },
    {
      id: '5',
      username: 'data_queen',
      email: 'queen@example.com',
      first_name: 'Emma',
      last_name: 'Brown',
      ranking: 5,
      points: 3540,
      problems_solved: 105,
      submissions: 223,
      accuracy: 47.1,
      school_id: '5',
      school_name: 'Berkeley',
      avatar: null,
      created_at: '2023-03-01T00:00:00Z',
    },
    {
      id: '6',
      username: 'python_pro',
      email: 'python@example.com',
      first_name: 'Charlie',
      last_name: 'Davis',
      ranking: 6,
      points: 3210,
      problems_solved: 98,
      submissions: 201,
      accuracy: 48.8,
      school_id: '6',
      school_name: 'Caltech',
      avatar: null,
      created_at: '2023-03-15T00:00:00Z',
    },
    {
      id: '7',
      username: 'java_guru',
      email: 'java@example.com',
      first_name: 'David',
      last_name: 'Miller',
      ranking: 7,
      points: 2980,
      problems_solved: 92,
      submissions: 189,
      accuracy: 48.7,
      school_id: '7',
      school_name: 'Georgia Tech',
      avatar: null,
      created_at: '2023-04-01T00:00:00Z',
    },
    {
      id: '8',
      username: 'rust_fanatic',
      email: 'rust@example.com',
      first_name: 'Sophie',
      last_name: 'Garcia',
      ranking: 8,
      points: 2750,
      problems_solved: 85,
      submissions: 178,
      accuracy: 47.8,
      school_id: '8',
      school_name: 'UIUC',
      avatar: null,
      created_at: '2023-04-15T00:00:00Z',
    },
    {
      id: '9',
      username: 'c_plus_plus_king',
      email: 'cpp@example.com',
      first_name: 'Frank',
      last_name: 'Martinez',
      ranking: 9,
      points: 2520,
      problems_solved: 78,
      submissions: 167,
      accuracy: 46.7,
      school_id: '9',
      school_name: 'Purdue',
      avatar: null,
      created_at: '2023-05-01T00:00:00Z',
    },
    {
      id: '10',
      username: 'web_wizard',
      email: 'web@example.com',
      first_name: 'Grace',
      last_name: 'Rodriguez',
      ranking: 10,
      points: 2310,
      problems_solved: 72,
      submissions: 156,
      accuracy: 46.2,
      school_id: '10',
      school_name: 'UCLA',
      avatar: null,
      created_at: '2023-05-15T00:00:00Z',
    },
  ]

  let filtered = [...allUsers]

  // 按学校过滤
  if (filters.school_id) {
    filtered = filtered.filter(u => u.school_id === filters.school_id)
  }

  // 分页
  const page = filters.page || 1
  const limit = filters.limit || 20
  const start = (page - 1) * limit
  const end = start + limit
  const paginated = filtered.slice(start, end)

  return {
    users: paginated,
    total: filtered.length,
    page,
    limit,
  }
}

function getMockOrganizationRanking(filters: RankingFilters): RankingResponse {
  // 组织排行榜模拟数据（按学校统计）
  const orgRanking = [
    {
      id: 'org1',
      username: 'MIT Team',
      email: 'mit@example.com',
      first_name: '',
      last_name: '',
      ranking: 1,
      points: 15420,
      problems_solved: 456,
      submissions: 1023,
      accuracy: 44.6,
      school_id: '1',
      school_name: 'MIT',
      avatar: null,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'org2',
      username: 'Stanford Team',
      email: 'stanford@example.com',
      first_name: '',
      last_name: '',
      ranking: 2,
      points: 12890,
      problems_solved: 389,
      submissions: 876,
      accuracy: 44.4,
      school_id: '2',
      school_name: 'Stanford',
      avatar: null,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'org3',
      username: 'Harvard Team',
      email: 'harvard@example.com',
      first_name: '',
      last_name: '',
      ranking: 3,
      points: 11230,
      problems_solved: 345,
      submissions: 765,
      accuracy: 45.1,
      school_id: '3',
      school_name: 'Harvard',
      avatar: null,
      created_at: '2023-01-01T00:00:00Z',
    },
  ]

  return {
    users: orgRanking,
    total: orgRanking.length,
    page: 1,
    limit: 20,
  }
}

function getMockSearchUsers(query: string): RankingResponse {
  const allUsers = getMockGlobalRanking({}).users

  if (!query) {
    return {
      users: [],
      total: 0,
      page: 1,
      limit: 20,
    }
  }

  const searchLower = query.toLowerCase()
  const filtered = allUsers.filter(user =>
    user.username.toLowerCase().includes(searchLower) ||
    user.email.toLowerCase().includes(searchLower) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower)
  )

  return {
    users: filtered,
    total: filtered.length,
    page: 1,
    limit: 20,
  }
}