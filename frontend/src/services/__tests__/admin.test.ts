import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { adminService } from '@/services/admin'

describe('adminService.getProblems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the management listing contract instead of the student-only public filter', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        problems: [
          {
            id: 7,
            title: 'Campus Draft',
            description: 'internal',
            difficulty: 'medium',
            visibility: 'campus',
            created_by: 12,
            created_at: '2026-04-08T00:00:00Z',
            time_limit: 2000,
            memory_limit: 131072,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      },
    })

    const result = await adminService.getProblems({ page: 1, limit: 20 })

    expect(mockApi.get).toHaveBeenCalledWith('/problems?page=1&limit=20&is_public=false')
    expect(result.problems[0].visibility).toBe('campus')
    expect(result.problems[0].status).toBe('draft')
  })
})
