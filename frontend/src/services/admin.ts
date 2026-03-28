import api from './api'
import type {
  AdminStats,
  ProblemManagement,
  BatchCreateAdminUser,
} from '@/types/admin'

function normalizeProblemStatus(problem: Record<string, unknown>): ProblemManagement['status'] {
  const backendStatus = typeof problem.status === 'string' ? problem.status.toLowerCase() : ''
  if (backendStatus === 'published' || backendStatus === 'draft' || backendStatus === 'archived') {
    return backendStatus
  }

  const visibility = typeof problem.visibility === 'string' ? problem.visibility.toLowerCase() : ''
  if (visibility === 'public') return 'published'
  if (visibility === 'archived') return 'archived'
  return 'draft'
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const [allUsers, activeUsers, problems, submissions, contests, reports, systemStatus] = await Promise.all([
      api.get('/users/admin?page=1&limit=1'),
      api.get('/users/admin?status=active&page=1&limit=1'),
      api.get('/problems?page=1&limit=1'),
      api.get('/submissions?limit=1&offset=0'),
      api.get('/contests?page=1&limit=1'),
      api.get('/admin/plagiarism/reports?page=1&limit=1'),
      api.get('/status'),
    ])

    const health = String(systemStatus.data?.status ?? '').toLowerCase()

    return {
      total_users: Number(allUsers.data?.total ?? 0),
      total_problems: Number(problems.data?.total ?? 0),
      total_submissions: Number(submissions.data?.total ?? 0),
      total_contests: Number(contests.data?.total ?? 0),
      active_users_today: Number(activeUsers.data?.total ?? 0),
      submissions_today: Number(submissions.data?.total ?? 0),
      pending_reports: Number(reports.data?.total ?? 0),
      system_health: health === 'healthy' ? 'healthy' : health === 'warning' ? 'warning' : 'error',
    }
  },

  async getUsers(params?: {
    search?: string
    role?: string
    status?: string
    sort?: string
    page?: number
    limit?: number
  }) {
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
    const response = await api.patch(`/users/admin/${userId}/role`, { role })
    return response.data
  },

  async toggleUserStatus(userId: string) {
    const response = await api.patch(`/users/admin/${userId}/status`)
    return response.data
  },

  async batchCreateUsers(payload: {
    users: BatchCreateAdminUser[]
    default_password?: string
    organization_id: number
    campus_id?: number | null
  }) {
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
    const queryParams = new URLSearchParams()
    queryParams.append('is_public', 'false')
    if (params?.search) queryParams.append('search', params.search)
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty)
    if (params?.status === 'published') {
      queryParams.append('visibility', 'public')
    } else if (params?.status === 'draft') {
      queryParams.append('visibility', 'private')
    }
    // Keep admin queries honest: the backend does not support list sorting here.
    if (params?.page) queryParams.append('page', String(params.page))
    if (params?.limit) queryParams.append('limit', String(params.limit))

    const response = await api.get(`/problems?${queryParams}`)
    const payload = response.data
    const problems = Array.isArray(payload?.problems) ? payload.problems : []

    return {
      problems: problems.map((problem: any) => ({
        id: String(problem.id),
        title: String(problem.title ?? ''),
        description: String(problem.description ?? ''),
        difficulty: (problem.difficulty ?? 'easy') as ProblemManagement['difficulty'],
        status: normalizeProblemStatus(problem),
        visibility: (problem.visibility ?? 'private') as ProblemManagement['visibility'],
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        submissions_count: Number(problem.submissions_count ?? 0),
        accepted_count: Number(problem.accepted_count ?? 0),
        author_id: String(problem.created_by ?? ''),
        author_username: String(problem.created_by ?? 'system'),
        created_at: String(problem.created_at ?? ''),
        is_published:
          normalizeProblemStatus(problem) === 'published' ||
          String(problem.visibility ?? '').toLowerCase() === 'public',
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
    const response = await api.put(`/problems/${problemId}`, {
      ...payload,
      is_public: payload.visibility ? payload.visibility === 'public' : undefined,
    })
    return response.data
  },

  async deleteProblem(problemId: string) {
    await api.delete(`/problems/${problemId}`)
    return { success: true }
  },
}
