// Barrel export for the auth feature.
// Only public API is exposed — internal components/hooks/services are not.

// Pages (for route registration)
export { LoginPage } from './pages/LoginPage'
export { RegisterPage } from './pages/RegisterPage'
export { UnauthorizedPage } from './pages/UnauthorizedPage'

// Route guards (used by App.tsx)
export { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
export { AdminRoute } from './components/AdminRoute'

// Hooks
export { useAuth } from './hooks/useAuth'

// Constants
export { TEACHER_ROLES, isTeacherOrAbove } from '@/shared/types/auth'
