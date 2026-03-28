import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG, STORAGE_KEYS } from './config'
import type { RefreshResponse } from '@/types/auth'

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export function persistRefreshedAuthTokens(
  response: RefreshResponse,
  fallbackRefreshToken?: string
) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, response.token)
  localStorage.setItem('token', response.token)

  const refreshToken = response.refresh_token ?? fallbackRefreshToken
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    localStorage.setItem('refresh_token', refreshToken)
  }
}

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.timeout,
  withCredentials: true,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(STORAGE_KEYS.TOKEN) ||
      localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken =
          localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ||
          localStorage.getItem('refresh_token')
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.refresh}`, {
            refresh_token: refreshToken,
          })

          persistRefreshedAuthTokens(response.data, refreshToken)

          originalRequest.headers.Authorization = `Bearer ${response.data.token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem('token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem(STORAGE_KEYS.USER)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
