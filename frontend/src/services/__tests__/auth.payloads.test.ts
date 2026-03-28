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

describe('authService payload alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the public login user shape from the login endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        token: 't1',
        refresh_token: 'r1',
        user: {
          id: 'u1',
          username: 'alice',
          email: 'a@example.com',
          role: 'user',
          school_id: 1,
          campus_id: null,
        },
      },
    })

    const data = await authService.login({ username: 'alice', password: 'pwd' })

    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', {
      username: 'alice',
      password: 'pwd',
    })
    expect(data.user).toMatchObject({
      id: 'u1',
      username: 'alice',
      school_id: 1,
    })
  })

  it('returns the profile registration user shape from the register endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        token: 't2',
        refresh_token: 'r2',
        user: {
          id: 'u2',
          user_code: '2026001',
          username: 'bob',
          email: 'b@example.com',
          display_name: 'Bob',
          organization_id: 8,
          campus_id: 2,
          role: 'student',
          status: 'active',
          ac_count: 3,
          contest_rating: 1400,
          created_at: '2026-03-27T00:00:00Z',
          updated_at: '2026-03-27T00:00:00Z',
        },
      },
    })

    const data = await authService.register({
      username: 'bob',
      password: 'pwd',
      organization_id: 8,
    })

    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', {
      username: 'bob',
      password: 'pwd',
      organization_id: 8,
    })
    expect(data.user).toMatchObject({
      user_code: '2026001',
      display_name: 'Bob',
      ac_count: 3,
      contest_rating: 1400,
    })
  })
})
