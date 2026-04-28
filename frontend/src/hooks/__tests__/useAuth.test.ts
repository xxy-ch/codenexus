import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock the config module to avoid import.meta.env issues
vi.mock('@/services/config', () => ({
  API_CONFIG: { baseURL: '/api' },
}))

const mockUser: AuthResponse['user'] = {
  id: '1',
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  organization_id: 1,
  campus_id: null,
  role: 'student',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const mockAuthResponse: AuthResponse = {
  user: mockUser,
  token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    mockFetch.mockReset()
  })

  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('login sets user and isAuthenticated on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAuthResponse,
    })

    await useAuthStore.getState().login({
      username: 'testuser',
      password: 'password123',
    })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()

    // Verify fetch was called with correct arguments
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/auth/login')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({
      username: 'testuser',
      password: 'password123',
    })
  })

  it('login sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    await expect(
      useAuthStore.getState().login({
        username: 'testuser',
        password: 'wrongpassword',
      })
    ).rejects.toThrow('Login failed')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe('Login failed')
  })

  it('login handles network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    await expect(
      useAuthStore.getState().login({
        username: 'testuser',
        password: 'password123',
      })
    ).rejects.toThrow('Network error')

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBe('Network error')
  })

  it('logout clears user and isAuthenticated', async () => {
    // Set authenticated state first
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    })

    // Mock the logout fetch call (fire-and-forget)
    mockFetch.mockResolvedValueOnce({ ok: true })

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBeNull()
  })

  it('checkAuth succeeds when user is authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    })

    await useAuthStore.getState().checkAuth()

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toContain('/users/me')
    expect(options.credentials).toBe('include')
  })

  it('checkAuth clears state when not authenticated', async () => {
    // Set some state first
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    })

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    await useAuthStore.getState().checkAuth()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
  })

  it('clearError resets error to null', () => {
    useAuthStore.setState({ error: 'Some error' })

    useAuthStore.getState().clearError()

    expect(useAuthStore.getState().error).toBeNull()
  })

  it('isLoading is true during async operations', async () => {
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(pendingPromise)

    const loginPromise = useAuthStore.getState().login({
      username: 'testuser',
      password: 'password123',
    })

    // While request is in flight, isLoading should be true
    expect(useAuthStore.getState().isLoading).toBe(true)

    // Resolve the request
    resolvePromise!({
      ok: true,
      json: async () => mockAuthResponse,
    })

    await loginPromise

    // After resolution, isLoading should be false
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
