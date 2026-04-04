import { Navigate, useLocation } from 'react-router-dom'
import Loading from '@/components/ui/Loading'
import { useAuthStore } from '@/store/authStore'

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return <Loading size="sm" />
  }

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  return <>{children}</>
}
