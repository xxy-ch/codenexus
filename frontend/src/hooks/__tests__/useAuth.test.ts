import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/store/authStore'
import type { AuthResponse } from '@/types/auth'
import { request } from '@/services/api'

// Mock the request module
vi.mock('@/services/api', () => ({
  request: vi.fn(),
}))

// Stub localStorage for this test suite
const localStorageStore = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageStore.set(key, value) },
  removeItem: (key: string) => { localStorageStore.delete(key) },
  clear: () => { localStorageStore.clear() },
  get length() { return localStorageStore.size },
}
vi.stubGlobal('localStorage', localStorageMock)

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
    vi.mocked(request).mockReset()
  })

  it('initial state is unauthenticated', () => {
    const state = useAuthStore.getState()

    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('login sets user and isAuthenticated on success', async () => {
    vi.mocked(request).mockResolvedValueOnce(mockAuthResponse)

    await useAuthStore.getState().login({
      username: 'testuser',
      password: 'password123',
    })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()

    // Verify request was called with correct arguments
    expect(request).toHaveBeenCalledTimes(1)
    const [method, url, data] = vi.mocked(request).mock.calls[0]
    expect(method).toBe('post')
    expect(url).toBe('/auth/login')
    expect(data).toEqual({
      username: 'testuser',
      password: 'password123',
    })
  })

  it('login sets error on failure', async () => {
    vi.mocked(request).mockRejectedValueOnce(new Error('Login failed'))

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
    vi.mocked(request).mockRejectedValueOnce(new Error('Network error'))

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

    // Mock the logout request call
    vi.mocked(request).mockResolvedValueOnce({})

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.error).toBeNull()
  })

  it('checkAuth succeeds when user is authenticated', async () => {
    vi.mocked(request).mockResolvedValueOnce(mockUser)

    await useAuthStore.getState().checkAuth()

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.isAuthenticated).toBe(true)
    expect(state.isLoading).toBe(false)

    expect(request).toHaveBeenCalledTimes(1)
    const [method, url] = vi.mocked(request).mock.calls[0]
    expect(method).toBe('get')
    expect(url).toBe('/users/me')
  })

  it('checkAuth clears state when not authenticated', async () => {
    // Set some state first
    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
    })

    vi.mocked(request).mockRejectedValueOnce(new Error('Unauthorized'))

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

    vi.mocked(request).mockReturnValueOnce(pendingPromise)

    const loginPromise = useAuthStore.getState().login({
      username: 'testuser',
      password: 'password123',
    })

    // While request is in flight, isLoading should be true
    expect(useAuthStore.getState().isLoading).toBe(true)

    // Resolve the request
    resolvePromise!(mockAuthResponse)

    await loginPromise

    // After resolution, isLoading should be false
    expect(useAuthStore.getState().isLoading).toBe(false)
  })
})
