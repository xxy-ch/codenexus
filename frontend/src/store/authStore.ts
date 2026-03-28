import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginResponse, RegisterResponse, SessionUser } from '@/types/auth'
import { API_CONFIG } from '@/services/config'
import { STORAGE_KEYS } from '@/services/config'

const buildApiUrl = (path: string) => `${API_CONFIG.baseURL}${path}`

function persistAuthSession(data: { token?: string | null; refreshToken?: string | null; user?: SessionUser | null }) {
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
  user: SessionUser | null
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
  checkAuth: () => Promise<boolean>
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

          const data: LoginResponse = await response.json()
          const sessionUser = normalizeLoginUser(data.user)
          persistAuthSession({
            token: data.token,
            refreshToken: data.refresh_token,
            user: sessionUser,
          })
          set({
            user: sessionUser,
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

          const authData: RegisterResponse = await response.json()
          const sessionUser = normalizeRegisterUser(authData.user)
          persistAuthSession({
            token: authData.token,
            refreshToken: authData.refresh_token,
            user: sessionUser,
          })
          set({
            user: sessionUser,
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
          return false
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
            user: normalizeCurrentUser(user),
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        } catch (error) {
          clearPersistedAuthSession()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return false
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

function normalizeLoginUser(user: LoginResponse['user']): SessionUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    organization_id: user.school_id,
    campus_id: user.campus_id ?? null,
  }
}

function normalizeRegisterUser(user: RegisterResponse['user']): SessionUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? null,
    display_name: user.display_name ?? null,
    organization_id: user.organization_id,
    campus_id: user.campus_id ?? null,
    role: user.role,
    user_code: user.user_code ?? null,
    status: user.status,
    ac_count: user.ac_count,
    contest_rating: user.contest_rating,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}

function normalizeCurrentUser(user: User): SessionUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email ?? null,
    display_name: user.display_name ?? null,
    organization_id: user.organization_id,
    campus_id: user.campus_id ?? null,
    role: user.role,
    user_code: user.user_code ?? null,
    status: user.status,
    ac_count: user.ac_count,
    contest_rating: user.contest_rating,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }
}
