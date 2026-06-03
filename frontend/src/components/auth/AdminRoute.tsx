import { Navigate } from 'react-router-dom'
import Loading from '@/components/ui/Loading'
import { useAuthStore } from '@/store/authStore'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return <Loading size="sm" />
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin' && user.role !== 'root') {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
