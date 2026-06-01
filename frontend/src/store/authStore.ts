import { create } from 'zustand'
import type { User, AuthResponse } from '@/types/auth'
import api, { request } from '@/services/api'

const accessTokenKey = 'access_token'

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
      const authData = await request<AuthResponse>('post', '/auth/register', data)

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
    const token = localStorage.getItem(accessTokenKey)
    if (token) {
      api.post('/auth/logout', undefined, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
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
      const user = await request<User>('get', '/users/me')
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
