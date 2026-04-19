import api from './api'
import type {
  AdminStats,
  ProblemManagement,
  SystemHealth,
  BatchCreateAdminUser,
} from '@/types/admin'

export const adminService = {
  async getStats(): Promise<AdminStats> {
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

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get<SystemHealth>('/admin/system/health')
    return response.data
  },

  async getReports(params?: {
    type?: string
    status?: string
    page?: number
    limit?: number
  }) {
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
