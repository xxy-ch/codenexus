import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types/auth'
import { authService } from '@/services/authService'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (username: string, password: string) => Promise<void>
  register: (data: { username: string; email: string; password: string }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true })
        try {
          const res = await authService.login({ username, password })
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          set({ isLoading: false })
          throw new Error('Invalid credentials')
        }
      },

      register: async (data: { username: string; email: string; password: string }) => {
        set({ isLoading: true })
        try {
          const res = await authService.register(data)
          set({
            user: res.user,
            token: res.token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          set({ isLoading: false })
          throw new Error('Registration failed')
        }
      },

      logout: () => {
        authService.logout()
        set({ user: null, token: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        const { token } = get()
        if (!token) return
        try {
          const user = await authService.getCurrentUser()
          set({ user, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
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
    },
  ),
)
