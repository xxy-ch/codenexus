import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loading } from '@/components/ui/Loading'
import { isAdmin } from '@/types/auth'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        const hasValidToken = await checkAuth()
        if (!hasValidToken) {
          setIsChecking(false)
          return
        }
      }
      setIsChecking(false)
    }

    verifyAuth()
  }, [isAuthenticated, checkAuth])

  if (isLoading || isChecking) {
    return <Loading message="加载中..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
