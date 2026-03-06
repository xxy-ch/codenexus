import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG, STORAGE_KEYS } from './config'

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

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

          const { token, refresh_token } = response.data
          localStorage.setItem(STORAGE_KEYS.TOKEN, token)
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token)
          localStorage.setItem('token', token)
          localStorage.setItem('refresh_token', refresh_token)

          originalRequest.headers.Authorization = `Bearer ${token}`
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
