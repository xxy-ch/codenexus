import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth'
import type { LoginRequest, RegisterRequest } from '@/types/auth'

export function useAuth() {
  const navigate = useNavigate()
  const { user, token, isAuthenticated, isLoading, error, login, register, logout, clearError, checkAuth } = useAuthStore()

  /**
   * 处理登录
   */
  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials)
      login({
        email: response.user.email,
        password: credentials.password,
      })
      // 手动设置状态
      useAuthStore.setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      // 保存令牌到localStorage
      localStorage.setItem('token', response.token)
      localStorage.setItem('refresh_token', response.refresh_token)
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
  }, [login, navigate])

  /**
   * 处理注册
   */
  const handleRegister = useCallback(async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data)
      // 设置状态
      useAuthStore.setState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      // 保存令牌到localStorage
      localStorage.setItem('token', response.token)
      localStorage.setItem('refresh_token', response.refresh_token)
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
  }, [register, navigate])

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
  const checkAuthentication = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return false
    }

    try {
      const user = await authService.getCurrentUser()
      useAuthStore.setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    } catch (error) {
      useAuthStore.setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      return false
    }
  }, [])

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth: checkAuthentication,
    clearError,
  }
}