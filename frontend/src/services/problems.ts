import api from '@/shared/services/api'
import type { Problem, ManagementTestCase, ProblemSubmission, PublicTestCase } from '@/types/problems'

export interface ProblemFilters {
  difficulty?: 'easy' | 'medium' | 'hard' | 'all'
  tags?: string[]
  search?: string
  page?: number
  limit?: number
  sort?: 'recent' | 'popular' | 'easy_first' | 'hard_first'
}

export interface ProblemsResponse {
  problems: Problem[]
  total: number
  page: number
  limit: number
  pages: number
}

export const problemsService = {
  /**
   * 获取题目列表
   */
  async getProblems(filters: ProblemFilters = {}): Promise<ProblemsResponse> {
    const params = new URLSearchParams()

    if (filters.difficulty && filters.difficulty !== 'all') {
      params.append('difficulty', filters.difficulty)
    }
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','))
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
    if (filters.sort) {
      params.append('sort', filters.sort)
    }

    const response = await api.get(`/problems?${params}`)
    const payload = response.data
    const problems = Array.isArray(payload?.problems) ? payload.problems : []

    return {
      problems: problems.map((problem: any) => ({
        id: String(problem.id),
        title: String(problem.title ?? ''),
        description: String(problem.description ?? ''),
        difficulty: (problem.difficulty ?? 'easy') as Problem['difficulty'],
        tags: Array.isArray(problem.tags) ? problem.tags : [],
        time_limit: Number(problem.time_limit ?? 1000),
        memory_limit: Number(problem.memory_limit ?? 262144),
        points: Number(problem.points ?? 0),
        created_at: String(problem.created_at ?? ''),
        updated_at: String(problem.updated_at ?? problem.created_at ?? ''),
      })),
      total: Number(payload?.total ?? problems.length),
      page: Number(payload?.page ?? filters.page ?? 1),
      limit: Number(payload?.limit ?? filters.limit ?? 20),
      pages: Math.max(1, Math.ceil(Number(payload?.total ?? problems.length) / Number(payload?.limit ?? filters.limit ?? 20))),
    }
  },

  /**
   * 获取单个题目详情
   */
  async getProblem(problemId: string): Promise<Problem> {
    const response = await api.get(`/problems/${problemId}`)
    const problem = response.data

    return {
      id: String(problem?.id ?? problemId),
      title: String(problem?.title ?? ''),
      description: String(problem?.description ?? ''),
      difficulty: (problem?.difficulty ?? 'easy') as Problem['difficulty'],
      tags: Array.isArray(problem?.tags) ? problem.tags : [],
      time_limit: Number(problem?.time_limit ?? 1000),
      memory_limit: Number(problem?.memory_limit ?? 262144),
      points: Number(problem?.points ?? 0),
      created_at: String(problem?.created_at ?? ''),
      updated_at: String(problem?.updated_at ?? problem?.created_at ?? ''),
    }
  },

  /**
   * 获取题目的测试用例。学生只会收到非隐藏样例；管理角色会收到完整用例。
   */
  async getTestCases(problemId: string): Promise<Array<PublicTestCase | ManagementTestCase>> {
    const response = await api.get<any[]>(`/problems/${problemId}/test-cases`)
    return (Array.isArray(response.data) ? response.data : []).map((testCase, index) => {
      const base = {
        id: String(testCase?.id ?? index + 1),
        problem_id: String(testCase?.problem_id ?? problemId),
        input: String(testCase?.input ?? ''),
        expected_output: String(testCase?.expected_output ?? ''),
        order: Number(testCase?.order ?? index),
      }

      if (testCase?.score != null) {
        return {
          ...base,
          is_hidden: Boolean(testCase?.is_hidden),
          score: Number(testCase.score),
        }
      }

      return {
        ...base,
        is_hidden: false,
      }
    })
  },

  /**
   * 提交代码
   */
  async submitCode(data: {
    problemId: string | number
    code: string
    language: string
    contestId?: string | number
  }): Promise<ProblemSubmission> {
    const problemId = Number(data.problemId)
    if (!Number.isInteger(problemId)) {
      throw new Error('Invalid problem id')
    }

    const contestId = data.contestId != null ? Number(data.contestId) : undefined
    if (data.contestId != null && !Number.isInteger(contestId)) {
      throw new Error('Invalid contest id')
    }

    const response = await api.post<ProblemSubmission>('/submissions', {
      problem_id: problemId,
      code: data.code,
      language: data.language,
      ...(contestId !== undefined ? { contest_id: contestId } : {}),
    })
    return response.data
  },

  /**
   * 获取题目的提交记录
   */
  async getProblemSubmissions(
    problemId: string,
    page = 1,
    limit = 20
  ): Promise<{ submissions: ProblemSubmission[]; total: number }> {
    const response = await api.get(
      `/problems/${problemId}/submissions?page=${page}&limit=${limit}`
    )
    return response.data
  },

  /**
   * 获取支持的语言列表
   */
  async getSupportedLanguages(): Promise<
    Array<{ id: string; name: string; extension: string; enabled: boolean; is_default: boolean }>
  > {
    const response = await api.get(
      '/problems/languages'
    )
    return response.data
  },

  /**
   * 获取用户的提交记录
   */
  async getUserSubmissions(filters: {
    page?: number
    limit?: number
    status?: string
    language?: string
  }): Promise<{
    submissions: Array<
      ProblemSubmission & {
        problem_title: string
        username: string
      }
    >
    total: number
    page: number
    limit: number
  }> {
    const params = new URLSearchParams()

    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.language) params.append('language', filters.language)

    try {
      const response = await api.get(`/submissions?${params}`)
      const rawSubmissions = Array.isArray(response.data?.submissions)
        ? response.data.submissions
        : []

      return {
        submissions: rawSubmissions.map(normalizeSubmission),
        total: Number(response.data?.total ?? rawSubmissions.length),
        page: Number(response.data?.page ?? filters.page ?? 1),
        limit: Number(response.data?.limit ?? filters.limit ?? 20),
      }
    } catch (error) {
      console.error('Failed to fetch user submissions:', error)
      throw error
    }
  },

  /**
   * 获取提交详情
   */
  async getSubmissionDetail(submissionId: string): Promise<ProblemSubmission & {
    problem_title: string
    username: string
  }> {
    try {
      const response = await api.get<ProblemSubmission & {
        problem_title: string
        username: string
      }>(`/submissions/${submissionId}`)
      return normalizeSubmission(response.data) as ProblemSubmission & {
        problem_title: string
        username: string
      }
    } catch (error) {
      console.error('Failed to fetch submission detail:', error)
      throw error
    }
  },

  async updateCorrectAnswerVisibility(
    problemId: string,
    showCorrectAnswer: boolean,
  ): Promise<{ problem_id: number; show_correct_answer: boolean }> {
    const response = await api.put<{ problem_id: number; show_correct_answer: boolean }>(
      `/problems/${problemId}/correct-answer-visibility`,
      { show_correct_answer: showCorrectAnswer },
    )
    return response.data
  },
}

function normalizeSubmission(submission: any): ProblemSubmission & {
  problem_title: string
  username: string
} {
  const normalizedStatus =
    submission?.status === 'compile_error'
      ? 'compilation_error'
      : submission?.status === 'internal_error'
      ? 'system_error'
      : submission?.status

  const testCases = Array.isArray(submission?.test_cases)
    ? submission.test_cases.map((tc: any, index: number) => ({
        id: Number(tc.id ?? index + 1),
        input: tc.input != null ? String(tc.input) : undefined,
        expected_output: tc.expected_output != null ? String(tc.expected_output) : undefined,
        actual_output: tc.actual_output != null ? String(tc.actual_output) : undefined,
        status: (tc.status ?? 'pending') as 'passed' | 'failed' | 'pending' | 'running',
        error: tc.error ?? tc.error_message ?? undefined,
        is_hidden: Boolean(tc.is_hidden),
        time_ms:
          tc.time_ms != null
            ? Number(tc.time_ms)
            : tc.runtime_ms != null
            ? Number(tc.runtime_ms)
            : undefined,
      }))
    : undefined

  return {
    id: String(submission?.id ?? ''),
    problem_id: String(submission?.problem_id ?? ''),
    user_id: String(submission?.user_id ?? ''),
    code: String(submission?.code ?? ''),
    language: String(submission?.language ?? ''),
    status: (normalizedStatus ?? 'pending') as ProblemSubmission['status'],
    time_ms:
      submission?.time_ms != null
        ? Number(submission.time_ms)
        : submission?.runtime_ms != null
        ? Number(submission.runtime_ms)
        : undefined,
    memory_kb:
      submission?.memory_kb != null ? Number(submission.memory_kb) : undefined,
    error_message:
      submission?.error_message != null ? String(submission.error_message) : undefined,
    show_correct_answer: Boolean(submission?.show_correct_answer ?? true),
    can_manage_correct_answer: Boolean(submission?.can_manage_correct_answer),
    test_cases: testCases,
    created_at: String(submission?.created_at ?? ''),
    updated_at: String(submission?.updated_at ?? submission?.created_at ?? ''),
    problem_title: String(
      submission?.problem_title ??
        (submission?.problem_id != null ? `Problem #${submission.problem_id}` : 'Unknown Problem')
    ),
    username: String(submission?.username ?? 'unknown'),
  }
}
