import type { AppRouteModule } from '../types'
import { PlaceholderPage } from '../PlaceholderPage'

export const teacherModule: AppRouteModule = {
  id: 'teacher',
  teacherRoutes: [
    { id: 'teacher-classes', path: 'classes', element: <PlaceholderPage title="班级管理" /> },
    { id: 'teacher-assignment-report', path: 'assignment-report', element: <PlaceholderPage title="作业报告" /> },
    { id: 'teacher-contest-wizard', path: 'contest-wizard', element: <PlaceholderPage title="竞赛向导" /> },
  ],
  navigation: [
    { id: 'nav-teacher-classes', label: 'Classes', path: '/teacher/classes', icon: 'groups', roles: ['teacher', 'admin', 'root'] },
    { id: 'nav-teacher-reports', label: 'Assignment Reports', path: '/teacher/assignment-report', icon: 'assessment', roles: ['teacher', 'admin', 'root'] },
  ],
}
