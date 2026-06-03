import api from '@/lib/api'
import type { Problem, ProblemSubmission, Language } from '@/types/problems'

export interface ListProblemsQuery {
  page?: number
  limit?: number
  difficulty?: string
  tag?: string
  search?: string
}

export interface ProblemsListResponse {
  problems: Problem[]
  total: number
  page: number
  limit: number
}

export const problemsService = {
  list: async (params: ListProblemsQuery = {}): Promise<ProblemsListResponse> => {
    const res = await api.get<ProblemsListResponse>('/problems', { params })
    return res.data
  },

  get: async (id: string): Promise<Problem> => {
    const res = await api.get<Problem>(`/problems/${id}`)
    return res.data
  },

  create: async (data: Partial<Problem>): Promise<Problem> => {
    const res = await api.post<Problem>('/problems', data)
    return res.data
  },

  update: async (id: string, data: Partial<Problem>): Promise<Problem> => {
    const res = await api.put<Problem>(`/problems/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/problems/${id}`)
  },

  getStatistics: async (id: string) => {
    const res = await api.get(`/problems/${id}/statistics`)
    return res.data
  },

  getLanguages: async (): Promise<Language[]> => {
    const res = await api.get<Language[]>('/problems/languages')
    return res.data
  },

  submit: async (data: { problem_id: string; code: string; language: string }): Promise<ProblemSubmission> => {
    const res = await api.post<ProblemSubmission>('/submissions', data)
    return res.data
  },

  getSubmissions: async (params: { problem_id?: string; status?: string; language?: string; limit?: number; offset?: number } = {}) => {
    const res = await api.get('/submissions', { params })
    return res.data
  },

  getSubmission: async (id: string): Promise<ProblemSubmission> => {
    const res = await api.get<ProblemSubmission>(`/submissions/${id}`)
    return res.data
  },

  getSubmissionStats: async () => {
    const res = await api.get('/submissions/stats')
    return res.data
  },
}
