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

vi.mock('@/services/config', async () => {
  const actual = await vi.importActual<typeof import('@/services/config')>('@/services/config')
  return {
    ...actual,
    USE_MOCK_DATA: true,
  }
})

import { adminService } from '@/services/admin'

describe('adminService truthfulness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds admin stats from real backend endpoints instead of a fake summary route', async () => {
    mockApi.get
      .mockResolvedValueOnce({ data: { total: 5 } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({ data: { total: 10 } })
      .mockResolvedValueOnce({ data: { total: 11 } })
      .mockResolvedValueOnce({ data: { total: 1 } })
      .mockResolvedValueOnce({ data: { total: 3 } })
      .mockResolvedValueOnce({ data: { status: 'healthy' } })

    const data = await adminService.getStats()

    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/users/admin?page=1&limit=1')
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/users/admin?status=active&page=1&limit=1')
    expect(mockApi.get).toHaveBeenNthCalledWith(3, '/problems?page=1&limit=1')
    expect(mockApi.get).toHaveBeenNthCalledWith(4, '/submissions?limit=1&offset=0')
    expect(mockApi.get).toHaveBeenNthCalledWith(5, '/contests?page=1&limit=1')
    expect(mockApi.get).toHaveBeenNthCalledWith(6, '/admin/plagiarism/reports?page=1&limit=1')
    expect(mockApi.get).toHaveBeenNthCalledWith(7, '/status')
    expect(data.total_users).toBe(5)
  })

  it('creates admin users through the API instead of synthesizing fake rows', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        created: [{ id: 'real-1', user_code: '2026001' }],
        skipped: [],
      },
    })

    const payload = {
      organization_id: 1,
      users: [
        {
          user_code: '2026001',
          role: 'user' as const,
        },
      ],
    }

    const data = await adminService.batchCreateUsers(payload)

    expect(mockApi.post).toHaveBeenCalledWith('/users/admin/batch-create', payload)
    expect(data.created[0].id).toBe('real-1')
  })
})
