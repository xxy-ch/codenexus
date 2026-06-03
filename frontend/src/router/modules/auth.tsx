import { lazy } from 'react'
import { PublicRoute } from '@/components/auth/PublicRoute'
import type { AppRouteModule } from '../types'
import { PlaceholderPage } from '../PlaceholderPage'

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const Unauthorized = lazy(() => import('@/pages/errors/Unauthorized'))
const NotFound = lazy(() => import('@/pages/errors/NotFound'))

export const authModule: AppRouteModule = {
  id: 'auth',
  publicRoutes: [
    {
      id: 'login',
      path: '/login',
      element: (
        <PublicRoute>
          <Login />
        </PublicRoute>
      ),
    },
    {
      id: 'register',
      path: '/register',
      element: (
        <PublicRoute>
          <Register />
        </PublicRoute>
      ),
    },
    { id: 'account-recovery', path: '/account-recovery', element: <PlaceholderPage title="账号恢复" /> },
    { id: 'terms', path: '/terms', element: <PlaceholderPage title="服务条款" /> },
    { id: 'privacy', path: '/privacy', element: <PlaceholderPage title="隐私政策" /> },
    { id: 'unauthorized', path: '/unauthorized', element: <Unauthorized /> },
    { id: 'legacy-forbidden', path: '/403', element: <Unauthorized /> },
    { id: 'server-error', path: '/500', element: <PlaceholderPage title="服务异常" /> },
    { id: 'not-found', path: '/404', element: <NotFound /> },
  ],
}
