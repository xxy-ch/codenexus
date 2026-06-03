import type { AppRouteModule } from '../types'
import { PlaceholderPage } from '../PlaceholderPage'

export const teacherModule: AppRouteModule = {
  id: 'teacher',
  teacherRoutes: [
    { id: 'teacher-classes', path: 'classes', element: <PlaceholderPage title="班级管理" /> },
    { id: 'teacher-assignment-report', path: 'assignment-report', element: <PlaceholderPage title="作业报告" /> },
    { id: 'teacher-contest-wizard', path: 'contest-wizard', element: <PlaceholderPage title="创建竞赛" /> },
    { id: 'teacher-problem-content', path: 'problem-content', element: <PlaceholderPage title="题目设置" /> },
    { id: 'teacher-features', path: 'features', element: <PlaceholderPage title="教师功能" /> },
  ],
  navigation: [
    { id: 'nav-teacher-classes', label: '班级管理', path: '/teacher/classes', icon: 'groups', roles: ['teacher', 'admin', 'root'] },
    { id: 'nav-teacher-contest-wizard', label: '创建竞赛', path: '/teacher/contest-wizard', icon: 'terminal', roles: ['teacher', 'admin', 'root'] },
    { id: 'nav-teacher-problem-content', label: '题目设置', path: '/teacher/problem-content', icon: 'settings', roles: ['teacher', 'admin', 'root'] },
    { id: 'nav-teacher-reports', label: '作业报告', path: '/teacher/assignment-report', icon: 'assessment', roles: ['teacher', 'admin', 'root'] },
    { id: 'nav-teacher-batch', label: '批量操作', path: '/batch-operations', icon: 'history', roles: ['teacher', 'admin', 'root'] },
  ],
}
