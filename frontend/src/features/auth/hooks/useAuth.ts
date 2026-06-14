import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { request } from '@/shared/services/api'
import type { User, LoginRequest, RegisterRequest } from '@/shared/types/auth'

export function useAuth() {
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    register: storeRegister,
    logout,
    clearError,
  } = useAuthStore()

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

  const handleLogout = useCallback(async () => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  const checkAuthentication = useCallback(async () => {
    try {
      const user = await request<User>('get', '/users/me')

      useAuthStore.setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    } catch {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return false
    }
  }, [])

  return {
    user,
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
