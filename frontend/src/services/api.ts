import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG } from './config'

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.timeout,
  withCredentials: true,
})

// Token refresh mutex — concurrent 401s share one refresh promise
let refreshPromise: Promise<string> | null = null

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Use shared refresh promise to prevent concurrent refreshes
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.refresh}`, {}, { withCredentials: true })
            .then((response) => response.data.token as string)
            .finally(() => { refreshPromise = null })
        }

        const newToken = await refreshPromise
        localStorage.setItem('access_token', newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        localStorage.removeItem('access_token')
        // Refresh failed — redirect to login
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Convenience wrapper that accepts an optional AbortSignal.
 */
export function request<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const config = signal ? { signal } : undefined
  switch (method) {
    case 'get':
      return api.get<T>(url, config).then((r) => r.data)
    case 'delete':
      return api.delete<T>(url, config).then((r) => r.data)
    case 'post':
      return api.post<T>(url, data, config).then((r) => r.data)
    case 'put':
      return api.put<T>(url, data, config).then((r) => r.data)
    case 'patch':
      return api.patch<T>(url, data, config).then((r) => r.data)
  }
}

export default api
