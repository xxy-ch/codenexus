import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import type { LoginRequest, RegisterRequest } from '@/types/auth'

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout,
    clearError,
    checkAuth,
  } = useAuthStore()

  /**
   * 处理登录
   */
  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    try {
      await storeLogin(credentials)
      navigate('/dashboard')
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      useAuthStore.setState({
        error: message,
        isLoading: false,
      })
      return { success: false, error: message }
    }
  }, [storeLogin, navigate])

  /**
   * 处理注册
   */
  const handleRegister = useCallback(async (data: RegisterRequest) => {
    try {
      await storeRegister(data)
      navigate('/dashboard')
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      useAuthStore.setState({
        error: message,
        isLoading: false,
      })
      return { success: false, error: message }
    }
  }, [storeRegister, navigate])

  /**
   * 处理登出
   */
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // 清除状态
      logout()
      // 清除本地存储
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      navigate('/login')
    }
  }, [logout, navigate])

  /**
   * 检查认证状态
   */
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth,
    clearError,
  }
}
