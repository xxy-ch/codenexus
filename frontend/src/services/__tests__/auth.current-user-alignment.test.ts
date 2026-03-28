import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { authService } from '@/services/auth'
import { useAuthStore } from '@/store/authStore'

function buildProfile(role = 'student') {
  return {
    id: 'user-1',
    user_code: '2026001',
    username: 'student01',
    email: null,
    display_name: 'Student One',
    organization_id: 8,
    campus_id: 2,
    role,
    status: 'active',
    ac_count: 12,
    contest_rating: 1688,
    created_at: '2026-03-27T00:00:00Z',
    updated_at: '2026-03-27T00:00:00Z',
  }
}

describe('auth current user alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('returns the full /users/me profile shape with open backend roles', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: buildProfile('student'),
    })

    const profile = await authService.getCurrentUser()

    expect(mockApi.get).toHaveBeenCalledWith('/users/me')
    expect(profile).toMatchObject({
      id: 'user-1',
      user_code: '2026001',
      username: 'student01',
      email: null,
      role: 'student',
      status: 'active',
      ac_count: 12,
      contest_rating: 1688,
    })
  })

  it('preserves the backend role string when hydrating auth state from /users/me', async () => {
    const fetchMock = vi.mocked(global.fetch)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => buildProfile('student'),
    } as Response)

    useAuthStore.setState({
      user: null,
      token: 'session-token',
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })

    const isValid = await useAuthStore.getState().checkAuth()

    expect(isValid).toBe(true)

    expect(fetchMock).toHaveBeenCalledWith('/api/users/me', {
      headers: {
        Authorization: 'Bearer session-token',
      },
    })

    expect(useAuthStore.getState().user).toMatchObject({
      role: 'student',
      email: null,
      status: 'active',
      ac_count: 12,
      contest_rating: 1688,
    })
  })
})
