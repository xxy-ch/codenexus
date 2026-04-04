import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { User } from '@/types/auth'
import Loading from '@/components/ui/Loading'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAuth?: boolean
  allowedRoles?: Array<User['role']>
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation()
  const { checkAuth, isAuthenticated, isLoading, token, user } = useAuthStore()
  const [isChecking, setIsChecking] = useState(requireAuth && !isAuthenticated && Boolean(token))

  useEffect(() => {
    let active = true

    async function verifyAuth() {
      if (requireAuth && !isAuthenticated && token) {
        await checkAuth()
      }

      if (active) {
        setIsChecking(false)
      }
    }

    void verifyAuth()

    return () => {
      active = false
    }
  }, [checkAuth, isAuthenticated, requireAuth, token])

  if (isLoading || isChecking) {
    return <Loading size="sm" />
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
