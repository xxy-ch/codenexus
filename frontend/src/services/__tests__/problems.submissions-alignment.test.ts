import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { problemsService } from '@/services/problems'

describe('problemsService submission alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads problem submissions through the real submissions query endpoint', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        submissions: [
          {
            id: 9,
            problem_id: 7,
            user_id: 'user-1',
            code: 'print(1)',
            language: 'python',
            status: 'accepted',
            created_at: '2026-03-25T12:00:00Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 20,
      },
    })

    const data = await problemsService.getProblemSubmissions('7', 2, 20)

    expect(mockApi.get).toHaveBeenCalledWith('/submissions?problem_id=7&limit=20&offset=20')
    expect(data.total).toBe(1)
    expect(data.submissions[0].problem_id).toBe('7')
  })
})
