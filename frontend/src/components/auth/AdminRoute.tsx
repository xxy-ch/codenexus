import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loading } from '@/components/ui/Loading'
import { isAdmin } from '@/types/auth'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return <Loading message="加载中..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
