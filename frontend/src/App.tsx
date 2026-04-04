import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { AppShell } from './components/layout/AppShell'
import Loading from './components/ui/Loading'

// Lazy page imports
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const Dashboard = lazy(() => import('./pages/user/Dashboard'))
const ProblemList = lazy(() => import('./pages/user/problems/ProblemList'))
const ProblemDetail = lazy(() => import('./pages/user/problems/ProblemDetail'))
const SubmissionHistory = lazy(() => import('./pages/user/SubmissionHistory'))
const UserRankings = lazy(() => import('./pages/user/UserRankings'))
const DiscussionForum = lazy(() => import('./pages/community/DiscussionForum'))
const ContestList = lazy(() => import('./pages/contest/ContestList'))
const ContestDetail = lazy(() => import('./pages/contest/ContestDetail'))
const OnlineIDE = lazy(() => import('./pages/user/OnlineIDE'))
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'))
const Unauthorized = lazy(() => import('./pages/errors/Unauthorized'))
const NotFound = lazy(() => import('./pages/errors/NotFound'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/403" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/403" element={<Unauthorized />} />

        {/* Protected user routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="problems" element={<ProblemList />} />
          <Route path="problems/:id" element={<ProblemDetail />} />
          <Route path="submissions" element={<SubmissionHistory />} />
          <Route path="rankings" element={<UserRankings />} />
          <Route path="ide" element={<OnlineIDE />} />
          <Route path="discussions" element={<DiscussionForum />} />
          <Route path="contests" element={<ContestList />} />
          <Route path="contests/:id" element={<ContestDetail />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppShell />
            </AdminRoute>
          }
        >
          <Route index element={<AdminPanel />} />
        </Route>

        {/* Fallback */}
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}
