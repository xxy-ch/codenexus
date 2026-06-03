import api from '@/lib/api'
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshResponse,
} from '@/types/auth'

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>('/auth/login', data)
    return res.data
  },

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const res = await api.post<RegisterResponse>('/auth/register', data)
    return res.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const res = await api.post<RefreshResponse>('/auth/refresh', { refresh_token: refreshToken })
    return res.data
  },

  getCurrentUser: async () => {
    const res = await api.get('/users/me')
    return res.data
  },
}
