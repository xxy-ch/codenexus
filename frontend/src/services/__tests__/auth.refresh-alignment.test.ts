import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    post: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { authService } from '@/services/auth'

describe('authService refresh alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts the refresh token in the backend request body', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        token: 'new-access-token',
      },
    })

    const data = await authService.refreshToken('refresh-token-123')

    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh', {
      refresh_token: 'refresh-token-123',
    })
    expect(data.token).toBe('new-access-token')
  })
})
