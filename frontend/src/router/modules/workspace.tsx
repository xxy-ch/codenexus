import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import type { AppRouteModule } from '../types'
import { PlaceholderPage } from '../PlaceholderPage'

const Dashboard = lazy(() => import('@/pages/user/Dashboard'))
const ProblemList = lazy(() => import('@/pages/user/problems/ProblemList'))
const ProblemDetail = lazy(() => import('@/pages/user/problems/ProblemDetail'))
const SubmissionHistory = lazy(() => import('@/pages/user/SubmissionHistory'))
const UserRankings = lazy(() => import('@/pages/user/UserRankings'))
const DiscussionForum = lazy(() => import('@/pages/community/DiscussionForum'))
const ContestList = lazy(() => import('@/pages/contest/ContestList'))
const ContestDetail = lazy(() => import('@/pages/contest/ContestDetail'))
const OnlineIDE = lazy(() => import('@/pages/user/OnlineIDE'))

export const workspaceModule: AppRouteModule = {
  id: 'workspace',
  workspaceRoutes: [
    { id: 'workspace-index', index: true, element: <Navigate to="/dashboard" replace /> },
    { id: 'dashboard', path: 'dashboard', element: <Dashboard /> },
    { id: 'problems', path: 'problems', element: <ProblemList /> },
    { id: 'problem-detail', path: 'problems/:id', element: <ProblemDetail /> },
    { id: 'problem-solve', path: 'problems/:id/solve', element: <ProblemDetail /> },
    { id: 'submissions', path: 'submissions', element: <SubmissionHistory /> },
    { id: 'submission-detail', path: 'submissions/:id', element: <SubmissionHistory /> },
    { id: 'contests', path: 'contests', element: <ContestList /> },
    { id: 'contest-detail', path: 'contests/:id', element: <ContestDetail /> },
    { id: 'contest-scoreboard', path: 'contests/:id/scoreboard', element: <ContestDetail /> },
    { id: 'ranking', path: 'ranking', element: <UserRankings /> },
    { id: 'rankings', path: 'rankings', element: <UserRankings /> },
    { id: 'roadmap', path: 'roadmap', element: <PlaceholderPage title="学习路线" /> },
    { id: 'profile', path: 'profile', element: <PlaceholderPage title="个人资料" /> },
    { id: 'settings', path: 'settings', element: <PlaceholderPage title="账号设置" /> },
    { id: 'discussions', path: 'discussions', element: <DiscussionForum /> },
    { id: 'discussion-new', path: 'discussions/new', element: <PlaceholderPage title="发起讨论" /> },
    { id: 'problem-discussion-new', path: 'discussions/:problemId/new', element: <PlaceholderPage title="题目讨论" /> },
    { id: 'discussion-detail', path: 'discussions/:id', element: <DiscussionForum /> },
    { id: 'blog', path: 'blog', element: <PlaceholderPage title="博客" /> },
    { id: 'blog-new', path: 'blog/new', element: <PlaceholderPage title="新建博客" /> },
    { id: 'blog-detail', path: 'blog/:id', element: <PlaceholderPage title="博客详情" /> },
    { id: 'blog-edit', path: 'blog/:id/edit', element: <PlaceholderPage title="编辑博客" /> },
    { id: 'messages', path: 'messages', element: <PlaceholderPage title="私信" />, featureFlag: 'directMessages' },
    { id: 'search', path: 'search', element: <PlaceholderPage title="搜索" /> },
    { id: 'ide', path: 'ide', element: <OnlineIDE /> },
  ],
  navigation: [
    { id: 'nav-dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { id: 'nav-problems', label: 'Problems', path: '/problems', icon: 'code' },
    { id: 'nav-contests', label: 'Contests', path: '/contests', icon: 'trophy' },
    { id: 'nav-ide', label: 'IDE', path: '/ide', icon: 'terminal' },
    { id: 'nav-rankings', label: 'Rankings', path: '/ranking', icon: 'leaderboard' },
    { id: 'nav-discussions', label: 'Discussions', path: '/discussions', icon: 'forum' },
    { id: 'nav-submissions', label: 'Submissions', path: '/submissions', icon: 'history' },
  ],
}
