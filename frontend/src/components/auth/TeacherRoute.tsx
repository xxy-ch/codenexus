import { ProtectedRoute } from './ProtectedRoute'

interface TeacherRouteProps {
  children: React.ReactNode
}

export function TeacherRoute({ children }: TeacherRouteProps) {
  return <ProtectedRoute allowedRoles={['teacher', 'admin']}>{children}</ProtectedRoute>
}
