import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { API_CONFIG } from './config'

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const authRetryExcludedPaths = [
  API_CONFIG.endpoints.login,
  API_CONFIG.endpoints.refresh,
  '/auth/logout',
]

function shouldAttemptTokenRefresh(request: RetryableRequestConfig): boolean {
  const url = request.url ?? ''
  const isAuthEndpoint = authRetryExcludedPaths.some((path) => url.includes(path))
  return !request._retry && !isAuthEndpoint
}

const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_CONFIG.timeout,
  withCredentials: true,
})

// Token refresh mutex — concurrent 401s share one refresh promise.
// Auth tokens are transported via HttpOnly cookies, not JS-readable storage.
let refreshPromise: Promise<void> | null = null

// Response interceptor to handle 401 with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (error.response?.status === 401 && originalRequest && shouldAttemptTokenRefresh(originalRequest)) {
      originalRequest._retry = true

      try {
        // Use shared refresh promise to prevent concurrent refreshes
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.refresh}`, {}, { withCredentials: true })
            .then(() => undefined)
            .finally(() => { refreshPromise = null })
        }

        await refreshPromise
        return api(originalRequest)
      } catch {
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
