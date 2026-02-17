import api from './api'
import type { Problem, TestCase, ProblemSubmission } from '@/types/problems'
import { getMockUserSubmissions, getMockSubmissionDetail } from './mockSubmissions'

// 开发模式下使用模拟数据的标志
const USE_MOCK_DATA = true // 临时启用模拟数据用于演示

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

    const response = await api.get<ProblemsResponse>(`/problems?${params}`)
    return response.data
  },

  /**
   * 获取单个题目详情
   */
  async getProblem(problemId: string): Promise<Problem> {
    const response = await api.get<Problem>(`/problems/${problemId}`)
    return response.data
  },

  /**
   * 获取题目的测试用例
   */
  async getTestCases(problemId: string): Promise<TestCase[]> {
    const response = await api.get<TestCase[]>(`/problems/${problemId}/testcases`)
    return response.data
  },

  /**
   * 提交代码
   */
  async submitCode(data: {
    problemId: string
    code: string
    language: string
  }): Promise<ProblemSubmission> {
    const response = await api.post<ProblemSubmission>('/submissions', {
      problem_id: data.problemId,
      code: data.code,
      language: data.language,
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
    Array<{ id: string; name: string; extension: string }>
  > {
    const response = await api.get(
      '/languages'
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
    submissions: ProblemSubmission[]
    total: number
    page: number
    limit: number
  }> {
    // 如果启用模拟数据，直接返回
    if (USE_MOCK_DATA) {
      return getMockUserSubmissions(filters)
    }

    const params = new URLSearchParams()

    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    if (filters.status) params.append('status', filters.status)
    if (filters.language) params.append('language', filters.language)

    try {
      const response = await api.get(`/submissions?${params}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      // 如果API调用失败，回退到模拟数据
      return getMockUserSubmissions(filters)
    }
  },

  /**
   * 获取提交详情
   */
  async getSubmissionDetail(submissionId: string): Promise<ProblemSubmission & {
    problem_title: string
    username: string
  }> {
    // 如果启用模拟数据，直接返回
    if (USE_MOCK_DATA) {
      return getMockSubmissionDetail(submissionId)
    }

    try {
      const response = await api.get<ProblemSubmission & {
        problem_title: string
        username: string
      }>(`/submissions/${submissionId}`)
      return response.data
    } catch (error) {
      console.warn('API调用失败，使用模拟数据:', error)
      // 如果API调用失败，回退到模拟数据
      return getMockSubmissionDetail(submissionId)
    }
  },
}

// Mock数据用于开发测试
export const mockProblems: Problem[] = [
  {
    id: '1',
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    difficulty: 'easy',
    tags: ['Array', 'Hash Table'],
    time_limit: 1000,
    memory_limit: 256,
    points: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Add Two Numbers',
    description: 'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit.',
    difficulty: 'medium',
    tags: ['Linked List', 'Math'],
    time_limit: 2000,
    memory_limit: 256,
    points: 20,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
  {
    id: '3',
    title: 'Longest Substring Without Repeating Characters',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    difficulty: 'medium',
    tags: ['String', 'Sliding Window'],
    time_limit: 1500,
    memory_limit: 128,
    points: 25,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
  },
  {
    id: '4',
    title: 'Median of Two Sorted Arrays',
    description: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.',
    difficulty: 'hard',
    tags: ['Array', 'Binary Search', 'Divide and Conquer'],
    time_limit: 3000,
    memory_limit: 512,
    points: 40,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
  },
  {
    id: '5',
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    difficulty: 'easy',
    tags: ['Linked List'],
    time_limit: 1000,
    memory_limit: 128,
    points: 15,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
]