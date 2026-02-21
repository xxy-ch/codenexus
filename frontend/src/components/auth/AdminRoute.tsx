import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loading } from '@/components/ui/Loading'

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

  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
