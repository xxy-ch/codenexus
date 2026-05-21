import { create } from 'zustand'
import type { User, AuthResponse } from '@/types/auth'
import { API_CONFIG } from '@/services/config'

const buildApiUrl = (path: string) => `${API_CONFIG.baseURL}${path}`
const accessTokenKey = 'access_token'

const authHeaders = () => {
  const token = localStorage.getItem(accessTokenKey)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data: AuthResponse = await response.json()
      localStorage.setItem(accessTokenKey, data.token)
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
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      const authData: AuthResponse = await response.json()
      localStorage.setItem(accessTokenKey, authData.token)
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
    // Call backend logout to blacklist the token
    fetch(buildApiUrl('/auth/logout'), {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
    }).catch(() => {})
    localStorage.removeItem(accessTokenKey)
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
      const response = await fetch(buildApiUrl('/users/me'), {
        headers: authHeaders(),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Auth check failed')
      }

      const user: User = await response.json()
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))
