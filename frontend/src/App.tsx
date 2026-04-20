import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { MainLayout } from './layouts/MainLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute'
import { AdminRoute } from './components/auth/AdminRoute'
import { Loading } from './components/ui/Loading'
import { TEACHER_ROLES } from './types/auth'
import { FEATURE_FLAGS } from './services/config'
import { ErrorBoundary } from './components/error/ErrorBoundary'

const lazyNamed = <T,>(loader: () => Promise<T>, exportName: keyof T) =>
  lazy(async () => {
    const module = await loader()
    return { default: module[exportName] as ComponentType }
  })

const LoginPage = lazyNamed(() => import('./pages/auth/LoginPage'), 'LoginPage')
const RegisterPage = lazyNamed(() => import('./pages/auth/RegisterPage'), 'RegisterPage')
const UnauthorizedPage = lazyNamed(() => import('./pages/auth/UnauthorizedPage'), 'UnauthorizedPage')
const NotFound = lazyNamed(() => import('./pages/error/NotFound'), 'NotFound')
const ServerError = lazyNamed(() => import('./pages/error/ServerError'), 'ServerError')
const DashboardEnhanced = lazyNamed(() => import('./pages/user/DashboardEnhanced'), 'DashboardEnhanced')
const ProblemSet = lazyNamed(() => import('./pages/user/ProblemSet'), 'ProblemSet')
const ProblemDetail = lazyNamed(() => import('./pages/user/ProblemDetail'), 'ProblemDetail')
const ProblemIDEEnhanced = lazyNamed(() => import('./pages/user/ProblemIDEEnhanced'), 'ProblemIDEEnhanced')
const SubmissionHistory = lazyNamed(() => import('./pages/user/SubmissionHistory'), 'SubmissionHistory')
const SubmissionDetail = lazyNamed(() => import('./pages/user/SubmissionDetail'), 'SubmissionDetail')
const ContestList = lazyNamed(() => import('./pages/user/ContestList'), 'ContestList')
const ContestDetail = lazyNamed(() => import('./pages/user/ContestDetail'), 'ContestDetail')
const ContestScoreboard = lazyNamed(() => import('./pages/contest/ContestScoreboard'), 'ContestScoreboard')
const Ranking = lazyNamed(() => import('./pages/user/Ranking'), 'Ranking')
const LearningRoadmap = lazyNamed(() => import('./pages/user/LearningRoadmap'), 'LearningRoadmap')
const DiscussionList = lazyNamed(() => import('./pages/community/DiscussionList'), 'DiscussionList')
const DiscussionDetail = lazyNamed(() => import('./pages/community/DiscussionDetail'), 'DiscussionDetail')
const CreateDiscussion = lazyNamed(() => import('./pages/community/CreateDiscussion'), 'CreateDiscussion')
const BlogList = lazyNamed(() => import('./pages/community/BlogList'), 'BlogList')
const BlogDetail = lazyNamed(() => import('./pages/community/BlogDetail'), 'BlogDetail')
const CreateArticle = lazyNamed(() => import('./pages/community/CreateArticle'), 'CreateArticle')
const EditArticle = lazyNamed(() => import('./pages/community/EditArticle'), 'EditArticle')
const DirectMessages = lazyNamed(() => import('./pages/community/DirectMessages'), 'DirectMessages')
const SearchResults = lazyNamed(() => import('./pages/search/SearchResults'), 'SearchResults')
const Profile = lazyNamed(() => import('./pages/user/Profile'), 'Profile')
const Settings = lazyNamed(() => import('./pages/user/Settings'), 'Settings')
const ClassManagement = lazyNamed(() => import('./pages/teacher/ClassManagement'), 'ClassManagement')
const AssignmentReport = lazyNamed(() => import('./pages/teacher/AssignmentReport'), 'AssignmentReport')
const ContestWizard = lazyNamed(() => import('./pages/teacher/ContestWizard'), 'ContestWizard')
const AdminDashboard = lazyNamed(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard')
const UserManagement = lazyNamed(() => import('./pages/admin/UserManagement'), 'UserManagement')
const ProblemManagement = lazyNamed(() => import('./pages/admin/ProblemManagement'), 'ProblemManagement')
const JudgeSettings = lazyNamed(() => import('./pages/admin/JudgeSettings'), 'JudgeSettings')
const ProblemContentConfig = lazyNamed(() => import('./pages/admin/ProblemContentConfig'), 'ProblemContentConfig')
const SimilarityScanConfig = lazyNamed(() => import('./pages/admin/SimilarityScanConfig'), 'SimilarityScanConfig')
const PlagiarismReportList = lazyNamed(() => import('./pages/admin/PlagiarismReportList'), 'PlagiarismReportList')
const PlagiarismReportDetail = lazyNamed(() => import('./pages/admin/PlagiarismReportDetail'), 'PlagiarismReportDetail')
const BatchOperations = lazyNamed(() => import('./pages/admin/BatchOperations'), 'BatchOperations')
const JudgeQueue = lazyNamed(() => import('./pages/admin/JudgeQueue'), 'JudgeQueue')
const GradeManagement = lazyNamed(() => import('./pages/admin/GradeManagement'), 'GradeManagement')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function RouteFallback() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Loading message="页面加载中..." />
    </div>
  )
}

function renderLazy(Component: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                {renderLazy(LoginPage)}
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                {renderLazy(RegisterPage)}
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={renderLazy(DashboardEnhanced)} />
            <Route path="problems" element={renderLazy(ProblemSet)} />
            <Route path="problems/:problemId" element={renderLazy(ProblemDetail)} />
            <Route path="problems/:problemId/solve" element={renderLazy(ProblemIDEEnhanced)} />
            <Route path="contests/:contestId/problems/:problemId/solve" element={renderLazy(ProblemIDEEnhanced)} />
            <Route path="submissions" element={renderLazy(SubmissionHistory)} />
            <Route path="submissions/:submissionId" element={renderLazy(SubmissionDetail)} />
            <Route path="contests" element={renderLazy(ContestList)} />
            <Route path="contests/:contestId" element={renderLazy(ContestDetail)} />
            <Route path="contests/:contestId/scoreboard" element={renderLazy(ContestScoreboard)} />
            <Route path="ranking" element={renderLazy(Ranking)} />
            <Route path="roadmap" element={renderLazy(LearningRoadmap)} />
            <Route path="discussions" element={renderLazy(DiscussionList)} />
            <Route path="discussions/new" element={renderLazy(CreateDiscussion)} />
            <Route path="discussions/:problemId/new" element={renderLazy(CreateDiscussion)} />
            <Route path="discussions/:id" element={renderLazy(DiscussionDetail)} />
            <Route path="blog" element={renderLazy(BlogList)} />
            <Route path="blog/new" element={renderLazy(CreateArticle)} />
            <Route path="blog/:slug" element={renderLazy(BlogDetail)} />
            <Route path="blog/:slug/edit" element={renderLazy(EditArticle)} />
            {FEATURE_FLAGS.directMessages && (
              <Route path="messages" element={renderLazy(DirectMessages)} />
            )}
            <Route path="search" element={renderLazy(SearchResults)} />
            <Route path="profile" element={renderLazy(Profile)} />
            <Route path="settings" element={renderLazy(Settings)} />
            {/* Teacher routes — gated by role */}
            <Route path="teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ClassManagement)}</ProtectedRoute>} />
            <Route path="teacher/assignment-report" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(AssignmentReport)}</ProtectedRoute>} />
            <Route path="teacher/contest-wizard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ContestWizard)}</ProtectedRoute>} />
            <Route path="batch-operations" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(BatchOperations)}</ProtectedRoute>} />
            {/* Add more protected routes here */}
          </Route>

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={renderLazy(AdminDashboard)} />
            <Route path="users" element={renderLazy(UserManagement)} />
            <Route path="problems" element={renderLazy(ProblemManagement)} />
            <Route path="judge-settings" element={renderLazy(JudgeSettings)} />
            <Route path="judge-queue" element={renderLazy(JudgeQueue)} />
            <Route path="grades" element={renderLazy(GradeManagement)} />
            <Route path="problem-content" element={renderLazy(ProblemContentConfig)} />
            {FEATURE_FLAGS.plagiarism && (
              <Route path="similarity-scan" element={renderLazy(SimilarityScanConfig)} />
            )}
            {FEATURE_FLAGS.plagiarism && (
              <Route path="plagiarism-reports" element={renderLazy(PlagiarismReportList)} />
            )}
            {FEATURE_FLAGS.plagiarism && (
              <Route path="plagiarism-reports/:reportId" element={renderLazy(PlagiarismReportDetail)} />
            )}
          </Route>

          {/* Error Routes */}
          <Route path="/unauthorized" element={renderLazy(UnauthorizedPage)} />
          <Route path="/404" element={renderLazy(NotFound)} />
          <Route path="/500" element={renderLazy(ServerError)} />

          {/* Fallback */}
          <Route path="*" element={renderLazy(NotFound)} />
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
