import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { RouteEntry } from './router/types'
import { getAdminRoutes, getPublicRoutes, getTeacherRoutes, getWorkspaceRoutes } from './router/registry'
import { AppShell } from './components/layout/AppShell'
import Loading from './components/ui/Loading'
import { AdminRoute } from './components/auth/AdminRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { TeacherRoute } from './components/auth/TeacherRoute'

function renderRoute(route: RouteEntry) {
  if (route.index) {
    return <Route key={route.id} index element={route.element} />
  }

  return <Route key={route.id} path={route.path} element={route.element} />
}

export default function App() {
  const publicRoutes = getPublicRoutes()
  const workspaceRoutes = getWorkspaceRoutes()
  const workspaceContentRoutes = workspaceRoutes.filter((route) => !route.index)
  const teacherRoutes = getTeacherRoutes()
  const adminRoutes = getAdminRoutes()

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {publicRoutes.map(renderRoute)}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {workspaceContentRoutes.map(renderRoute)}
        </Route>

        <Route
          path="/teacher"
          element={
            <TeacherRoute>
              <AppShell />
            </TeacherRoute>
          }
        >
          {teacherRoutes.map(renderRoute)}
        </Route>

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppShell />
            </AdminRoute>
          }
        >
          {adminRoutes.map(renderRoute)}
        </Route>

        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  )
}
