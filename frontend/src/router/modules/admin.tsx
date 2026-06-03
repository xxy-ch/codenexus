import { lazy } from 'react'
import type { AppRouteModule } from '../types'
import { PlaceholderPage } from '../PlaceholderPage'

const AdminPanel = lazy(() => import('@/pages/admin/AdminPanel'))

export const adminModule: AppRouteModule = {
  id: 'admin',
  adminRoutes: [
    { id: 'admin-index', index: true, element: <AdminPanel /> },
    { id: 'admin-users', path: 'users', element: <PlaceholderPage title="用户管理" /> },
    { id: 'admin-problems', path: 'problems', element: <AdminPanel /> },
    { id: 'admin-judge-settings', path: 'judge-settings', element: <PlaceholderPage title="评测设置" /> },
    { id: 'admin-problem-content', path: 'problem-content', element: <PlaceholderPage title="题目内容管理" /> },
    {
      id: 'admin-similarity-scan',
      path: 'similarity-scan',
      element: <PlaceholderPage title="相似度扫描" />,
      featureFlag: 'plagiarism',
    },
    {
      id: 'admin-plagiarism-reports',
      path: 'plagiarism-reports',
      element: <PlaceholderPage title="查重报告" />,
      featureFlag: 'plagiarism',
    },
    {
      id: 'admin-plagiarism-report-detail',
      path: 'plagiarism-reports/:id',
      element: <PlaceholderPage title="查重报告详情" />,
      featureFlag: 'plagiarism',
    },
  ],
  navigation: [
    { id: 'nav-admin', label: 'Admin Panel', path: '/admin', icon: 'settings', roles: ['admin', 'root'] },
    { id: 'nav-admin-users', label: 'Users', path: '/admin/users', icon: 'manage_accounts', roles: ['admin', 'root'] },
  ],
}
