import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'
import { authService } from '@/services/authService'
import { STORAGE_KEYS } from '@/services/config'

type RegisterPayload = {
  username: string
  email: string
  password: string
}

type PersistedSession = {
  token?: string | null
  refreshToken?: string | null
  user?: User | null
}

function persistAuthSession({ token, refreshToken, user }: PersistedSession) {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    localStorage.setItem('token', token)
  }

  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    localStorage.setItem('refresh_token', refreshToken)
  }

  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
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

  login: (username: string, password: string) => Promise<void>
  register: (data: RegisterPayload) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
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

      login: async (username: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authService.login({ username, password })
          persistAuthSession({
            token: res.token,
            refreshToken: res.refresh_token,
            user: res.user,
          })
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Invalid credentials'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      register: async (data: RegisterPayload) => {
        set({ isLoading: true, error: null })
        try {
          const res = await authService.register(data)
          persistAuthSession({
            token: res.token,
            refreshToken: res.refresh_token,
            user: res.user,
          })
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed'
          set({ isLoading: false, error: message })
          throw new Error(message)
        }
      },

      logout: () => {
        clearPersistedAuthSession()
        void authService.logout().catch(() => undefined)
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
      },

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
        const token = get().token ?? storedToken

        if (!token) {
          clearPersistedAuthSession()
          set({ user: null, token: null, isAuthenticated: false, isLoading: false })
          return false
        }

        if (get().token !== token) {
          set({ token })
        }

        set({ isLoading: true, error: null })

        try {
          const user = await authService.getCurrentUser()
          persistAuthSession({ token, user })
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
          return true
        } catch {
          clearPersistedAuthSession()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
          return false
        }
      },

      refreshUser: async () => {
        await get().checkAuth()
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
