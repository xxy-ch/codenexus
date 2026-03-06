import api from './api'

export interface JudgeTestCase {
  id: number
  problem_id: number
  input: string
  expected_output: string
  is_hidden: boolean
  score: number
  order: number
  created_at: string
}

export interface JudgeProblemDetail {
  id: string
  title: string
  description: string
  difficulty: string
  time_limit: number
  memory_limit: number
  visibility: string
  tags?: string[]
  is_public: boolean
}

export interface UpdateProblemContentPayload {
  title?: string
  description?: string
  difficulty?: string
  time_limit?: number
  memory_limit?: number
  visibility?: string
  tags?: string[]
  is_public?: boolean
  source_url?: string
  author_note?: string
}

export const judgeConfigService = {
  async getTestCases(problemId: string): Promise<JudgeTestCase[]> {
    const response = await api.get<JudgeTestCase[]>(`/problems/${problemId}/test-cases`)
    return response.data || []
  },

  async createTestCase(problemId: string, payload: Partial<JudgeTestCase>) {
    const response = await api.post<JudgeTestCase>(`/problems/${problemId}/test-cases`, {
      input: payload.input ?? '',
      expected_output: payload.expected_output ?? '',
      is_hidden: payload.is_hidden ?? false,
      score: payload.score ?? 10,
      order: payload.order ?? 0,
    })
    return response.data
  },

  async updateTestCase(problemId: string, testCaseId: number, payload: Partial<JudgeTestCase>) {
    const response = await api.put<JudgeTestCase>(`/problems/${problemId}/test-cases/${testCaseId}`, {
      input: payload.input,
      expected_output: payload.expected_output,
      is_hidden: payload.is_hidden,
      score: payload.score,
      order: payload.order,
    })
    return response.data
  },

  async deleteTestCase(problemId: string, testCaseId: number) {
    await api.delete(`/problems/${problemId}/test-cases/${testCaseId}`)
  },

  async getProblem(problemId: string): Promise<JudgeProblemDetail> {
    const response = await api.get<JudgeProblemDetail>(`/problems/${problemId}`)
    return response.data
  },

  async updateProblem(problemId: string, payload: UpdateProblemContentPayload): Promise<JudgeProblemDetail> {
    const response = await api.put<JudgeProblemDetail>(`/problems/${problemId}`, payload)
    return response.data
  },
}
