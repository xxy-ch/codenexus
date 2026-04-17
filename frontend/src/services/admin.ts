import api from './api'
import { USE_MOCK_DATA } from './config'
import type {
  AdminStats,
  UserManagement,
  ProblemManagement,
  SystemHealth,
  Report,
  BatchCreateAdminUser,
} from '@/types/admin'

export const adminService = {
  async getStats(): Promise<AdminStats> {
    if (USE_MOCK_DATA) return getMockStats()

    const response = await api.get<AdminStats>('/admin/stats')
    return response.data
  },

  async getUsers(params?: {
    search?: string
    role?: string
    status?: string
    sort?: string
    page?: number
    limit?: number
  }) {
    if (USE_MOCK_DATA) return getMockUsers(params?.page, params?.limit, params?.role, params?.search)

    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.role) queryParams.append('role', params.role)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.sort) queryParams.append('sort', params.sort)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const response = await api.get(`/users/admin?${queryParams}`)
    return response.data
  },

  async updateUserRole(userId: string, role: string) {
    if (USE_MOCK_DATA) return { success: true }

    const response = await api.patch(`/users/admin/${userId}/role`, { role })
    return response.data
  },

  async toggleUserStatus(userId: string) {
    if (USE_MOCK_DATA) return { success: true }

    const response = await api.patch(`/users/admin/${userId}/status`)
    return response.data
  },

  async batchCreateUsers(payload: {
    users: BatchCreateAdminUser[]
    default_password?: string
    organization_id: number
    campus_id?: number | null
  }) {
    if (USE_MOCK_DATA) {
      return {
        created: payload.users.map((user, index) => ({
          id: `mock-${index}`,
          user_code: user.user_code,
          username: user.user_code,
          email: user.email ?? null,
          display_name: user.display_name ?? user.user_code,
          organization_id: payload.organization_id,
          campus_id: user.campus_id ?? payload.campus_id ?? null,
          role: user.role ?? 'student',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        skipped: [],
      }
    }

    const response = await api.post('/users/admin/batch-create', payload)
    return response.data
  },

  async getProblems(params?: {
    search?: string
    difficulty?: string
    status?: string
    sort?: string
    page?: number
    limit?: number
  }) {
    if (USE_MOCK_DATA) return getMockProblems(params?.page, params?.limit, params?.status)

    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))
    queryParams.append('is_public', 'false')

    const response = await api.get(`/problems?${queryParams}`)
    const payload = response.data
    const problems = Array.isArray(payload?.problems) ? payload.problems : []

    return {
      problems: problems.map((problem: any) => ({
        id: String(problem.id),
        title: String(problem.title ?? ''),
        description: String(problem.description ?? ''),
        difficulty: (problem.difficulty ?? 'easy') as ProblemManagement['difficulty'],
        status: problem.visibility === 'public' ? 'published' : 'draft',
        visibility: (problem.visibility ?? 'private') as ProblemManagement['visibility'],
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        submissions_count: Number(problem.submissions_count ?? 0),
        accepted_count: Number(problem.accepted_count ?? 0),
        author_id: String(problem.created_by ?? ''),
        author_username: String(problem.created_by ?? 'system'),
        created_at: String(problem.created_at ?? ''),
        is_published: problem.visibility === 'public',
        time_limit: Number(problem.time_limit ?? 1000),
        memory_limit: Number(problem.memory_limit ?? 262144),
      })),
      total: Number(payload?.total ?? problems.length),
      page: Number(payload?.page ?? params?.page ?? 1),
      limit: Number(payload?.limit ?? params?.limit ?? 20),
    }
  },

  async createProblem(payload: {
    title: string
    description: string
    difficulty: 'easy' | 'medium' | 'hard'
    time_limit: number
    memory_limit: number
    visibility: 'public' | 'campus' | 'class' | 'private'
    organization_id: number
  }) {
    if (USE_MOCK_DATA) {
      return {
        id: `mock-${Date.now()}`,
        ...payload,
      }
    }

    const response = await api.post('/problems', {
      ...payload,
      is_public: payload.visibility === 'public',
      tags: [],
    })
    return response.data
  },

  async updateProblem(problemId: string, payload: {
    title?: string
    description?: string
    difficulty?: 'easy' | 'medium' | 'hard'
    time_limit?: number
    memory_limit?: number
    visibility?: 'public' | 'campus' | 'class' | 'private'
  }) {
    if (USE_MOCK_DATA) return { success: true }

    const response = await api.put(`/problems/${problemId}`, {
      ...payload,
      is_public: payload.visibility ? payload.visibility === 'public' : undefined,
    })
    return response.data
  },

  async deleteProblem(problemId: string) {
    if (USE_MOCK_DATA) return { success: true }

    await api.delete(`/problems/${problemId}`)
    return { success: true }
  },

  async getSystemHealth(): Promise<SystemHealth> {
    if (USE_MOCK_DATA) return getMockSystemHealth()

    const response = await api.get<SystemHealth>('/admin/system/health')
    return response.data
  },

  async getReports(params?: {
    type?: string
    status?: string
    page?: number
    limit?: number
  }) {
    if (USE_MOCK_DATA) return getMockReports(params)

    const queryParams = new URLSearchParams()
    if (params?.type) queryParams.append('type', params.type)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const response = await api.get(`/admin/reports?${queryParams}`)
    return response.data
  },

  async updateReportStatus(
    reportId: string,
    status: 'reviewing' | 'resolved' | 'dismissed',
    resolutionNotes?: string
  ) {
    if (USE_MOCK_DATA) return { success: true }

    const response = await api.patch(`/admin/reports/${reportId}`, {
      status,
      resolution_notes: resolutionNotes,
    })
    return response.data
  },
}

export const judgeQueueService = {
  async getStatus() {
    const response = await api.get('/admin/judge/status')
    return response.data
  },

  async getDlqEntries(count = 50, startId?: string) {
    const params = new URLSearchParams()
    params.append('count', String(count))
    if (startId) params.append('start_id', startId)
    const response = await api.get(`/admin/judge/dlq?${params}`)
    return response.data
  },

  async retryDlqEntry(entryId: string) {
    const response = await api.post(`/admin/judge/dlq/${entryId}/retry`)
    return response.data
  },

  async deleteDlqEntry(entryId: string) {
    const response = await api.delete(`/admin/judge/dlq/${entryId}`)
    return response.data
  },
}

function getMockStats(): AdminStats {
  return {
    total_users: 1250,
    total_problems: 156,
    total_submissions: 15420,
    total_contests: 24,
    active_users_today: 89,
    submissions_today: 342,
    pending_reports: 3,
    system_health: 'healthy',
  }
}

function getMockUsers(page = 1, limit = 20, role?: string, search?: string) {
  const users: UserManagement[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'root',
      organization_id: 1,
      organization_name: 'MIT',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      last_login: '2024-01-12T10:00:00Z',
      submissions_count: 150,
      problems_solved: 45,
    },
    {
      id: '2',
      username: 'moderator1',
      email: 'moderator@example.com',
      role: 'teacher',
      organization_id: 2,
      organization_name: 'Stanford',
      status: 'active',
      created_at: '2023-06-01T00:00:00Z',
      last_login: '2024-01-11T15:30:00Z',
      submissions_count: 89,
      problems_solved: 32,
    },
    {
      id: '3',
      username: 'user1',
      email: 'user@example.com',
      role: 'student',
      organization_id: 2,
      organization_name: 'Stanford',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      submissions_count: 34,
      problems_solved: 12,
    },
  ]

  let filtered = users
  if (role && role !== 'all') {
    filtered = filtered.filter(u => u.role === role)
  }
  if (search) {
    filtered = filtered.filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email ?? '').toLowerCase().includes(search.toLowerCase())
    )
  }

  const start = (page - 1) * limit
  return {
    users: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  }
}

function getMockProblems(page = 1, limit = 20, status?: string) {
  const problems: ProblemManagement[] = [
    {
      id: '1',
      title: 'Two Sum',
      difficulty: 'easy',
      status: 'published',
      tags: ['数组', '哈希表'],
      submissions_count: 1250,
      accepted_count: 856,
      author_id: 'admin',
      author_username: 'admin',
      created_at: '2023-01-01T00:00:00Z',
      is_published: true,
    },
    {
      id: '2',
      title: 'Add Two Numbers',
      difficulty: 'medium',
      status: 'published',
      tags: ['链表', '数学'],
      submissions_count: 890,
      accepted_count: 402,
      author_id: 'admin',
      author_username: 'admin',
      created_at: '2023-01-02T00:00:00Z',
      is_published: true,
    },
    {
      id: '3',
      title: 'Merge k Sorted Lists',
      difficulty: 'hard',
      status: 'draft',
      tags: ['链表', '堆', '分治'],
      submissions_count: 0,
      accepted_count: 0,
      author_id: 'admin',
      author_username: 'admin',
      created_at: '2023-01-03T00:00:00Z',
      is_published: false,
    },
  ]

  let filtered = problems
  if (status && status !== 'all') {
    filtered = filtered.filter(p => p.status === status)
  }

  const start = (page - 1) * limit
  return {
    problems: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  }
}

function getMockSystemHealth(): SystemHealth {
  return {
    cpu_usage: 35.2,
    memory_usage: 62.8,
    disk_usage: 48.5,
    active_judges: 3,
    queue_length: 12,
    avg_response_time: 450,
  }
}

function getMockReports(params?: {
  type?: string
  status?: string
  page?: number
  limit?: number
}) {
  const reports: Report[] = [
    {
      id: '1',
      type: 'blog',
      target_id: 'blog1',
      target_title: '动态规划完全指南',
      reason: 'inappropriate',
      description: '文章中包含不当内容',
      reporter_id: 'user1',
      reporter_username: 'reporter1',
      status: 'pending',
      created_at: '2024-01-12T10:00:00Z',
      updated_at: '2024-01-12T10:00:00Z',
    },
    {
      id: '2',
      type: 'comment',
      target_id: 'comment1',
      target_title: '评论1',
      reason: 'spam',
      description: '垃圾评论',
      reporter_id: 'user2',
      reporter_username: 'reporter2',
      status: 'reviewing',
      created_at: '2024-01-11T15:30:00Z',
      updated_at: '2024-01-11T16:00:00Z',
      reviewer_id: 'admin',
      reviewer_username: 'admin',
    },
    {
      id: '3',
      type: 'discussion',
      target_id: 'discussion1',
      target_title: '求助：这道题怎么做？',
      reason: 'other',
      description: '重复发帖',
      reporter_id: 'user3',
      reporter_username: 'reporter3',
      status: 'resolved',
      created_at: '2024-01-10T09:00:00Z',
      updated_at: '2024-01-10T10:00:00Z',
      reviewer_id: 'admin',
      reviewer_username: 'admin',
      resolution_notes: '已合并重复帖子',
    },
  ]

  let filtered = reports
  if (params?.type && params.type !== 'all') {
    filtered = filtered.filter(r => r.type === params.type)
  }
  if (params?.status && params.status !== 'all') {
    filtered = filtered.filter(r => r.status === params.status)
  }

  const page = params?.page || 1
  const limit = params?.limit || 20
  const start = (page - 1) * limit

  return {
    reports: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
  }
}
