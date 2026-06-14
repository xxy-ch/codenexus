import { create } from 'zustand'
import type { User, AuthResponse } from '@/shared/types/auth'
import api, { request } from '@/shared/services/api'
import { AxiosError } from 'axios'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (credentials: { username: string; password: string }) => Promise<void>
  register: (data: {
    email?: string
    username: string
    password: string
    display_name?: string
    organization_id: number
    campus_id?: number | null
  }) => Promise<void>
  logout: () => void
  clearError: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials) => {
    set({ isLoading: true, error: null })
    try {
      const data = await request<AuthResponse>('post', '/auth/login', credentials)

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      })
      throw error
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const authData = await request<AuthResponse>('post', '/auth/register', data)

      set({
        user: authData.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Registration failed',
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    api.post('/auth/logout').catch(() => {})
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  clearError: () => set({ error: null }),

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await request<User>('get', '/users/me')
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      // Only treat a confirmed 401 as "not authenticated". Network errors,
      // timeouts, and 5xx server failures are transient — clearing the auth
      // state here would force a logout on every flaky request or temporary
      // backend outage. The axios interceptor already redirects to /login on
      // a failed token refresh, so a 401 that survives refresh is handled there.
      const isUnauthorized =
        error instanceof AxiosError && error.response?.status === 401
      if (isUnauthorized) {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      } else {
        // Transient error: keep the existing auth state so the user is not
        // logged out. isLoading is reset so the UI stops showing a spinner.
        set({ isLoading: false })
      }
    }
  },
}))
