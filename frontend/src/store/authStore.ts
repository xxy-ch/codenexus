import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthResponse } from '@/types/auth'
import { API_CONFIG } from '@/services/config'
import { STORAGE_KEYS } from '@/services/config'

const buildApiUrl = (path: string) => `${API_CONFIG.baseURL}${path}`

function persistAuthSession(data: { token?: string | null; refreshToken?: string | null; user?: User | null }) {
  if (data.token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token)
    localStorage.setItem('token', data.token)
  }

  if (data.refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken)
    localStorage.setItem('refresh_token', data.refreshToken)
  }

  if (data.user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))
  }
}

function clearPersistedAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_KEYS.USER)
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
}

interface AuthState {
  user: User | null
  token: string | null
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await fetch(buildApiUrl('/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          })

          if (!response.ok) {
            throw new Error('Login failed')
          }

          const data: AuthResponse = await response.json()
          persistAuthSession({
            token: data.token,
            refreshToken: data.refresh_token,
            user: data.user,
          })
          set({
            user: data.user,
            token: data.token,
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
            body: JSON.stringify(data),
          })

          if (!response.ok) {
            throw new Error('Registration failed')
          }

          const authData: AuthResponse = await response.json()
          persistAuthSession({
            token: authData.token,
            refreshToken: authData.refresh_token,
            user: authData.user,
          })
          set({
            user: authData.user,
            token: authData.token,
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
        clearPersistedAuthSession()
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        const { token } = get()
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }

        set({ isLoading: true })
        try {
          const response = await fetch(buildApiUrl('/users/me'), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
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
        } catch (error) {
          clearPersistedAuthSession()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
