import { lazy, Suspense, type ComponentType } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components/Toast'
import { MainLayout } from '@/shared/layouts/MainLayout'
import { AdminLayout } from '@/shared/layouts/AdminLayout'
import { ProtectedRoute, PublicRoute } from '@/features/auth'
import { AdminRoute } from '@/features/auth'
import { Loading } from '@/shared/components/Loading'
import { TEACHER_ROLES } from '@/shared/types/auth'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { useFeatureEnabled } from '@/shared/hooks/useFeatureGate'

const lazyNamed = <T,>(loader: () => Promise<T>, exportName: keyof T) =>
  lazy(async () => {
    const module = await loader()
    return { default: module[exportName] as ComponentType }
  })

const LoginPage = lazyNamed(() => import('@/features/auth/pages/LoginPage'), 'LoginPage')
const RegisterPage = lazyNamed(() => import('@/features/auth/pages/RegisterPage'), 'RegisterPage')
const UnauthorizedPage = lazyNamed(() => import('@/features/auth/pages/UnauthorizedPage'), 'UnauthorizedPage')
const NotFound = lazyNamed(() => import('@/shared/components/NotFound'), 'NotFound')
const ServerError = lazyNamed(() => import('@/shared/components/ServerError'), 'ServerError')
const DashboardEnhanced = lazyNamed(() => import('@/features/dashboard/pages/DashboardEnhanced'), 'DashboardEnhanced')
const ProblemSet = lazyNamed(() => import('@/features/problems/pages/ProblemSet'), 'ProblemSet')
const ProblemDetail = lazyNamed(() => import('@/features/problems/pages/ProblemDetail'), 'ProblemDetail')
const ProblemIDEEnhanced = lazyNamed(() => import('@/features/problems/pages/ProblemIDEEnhanced'), 'ProblemIDEEnhanced')
const SubmissionHistory = lazyNamed(() => import('@/features/submissions/pages/SubmissionHistory'), 'SubmissionHistory')
const SubmissionDetail = lazyNamed(() => import('@/features/submissions/pages/SubmissionDetail'), 'SubmissionDetail')
const ContestList = lazyNamed(() => import('@/features/contests/pages/ContestList'), 'ContestList')
const ContestDetail = lazyNamed(() => import('@/features/contests/pages/ContestDetail'), 'ContestDetail')
const ContestScoreboard = lazyNamed(() => import('@/features/contests/pages/ContestScoreboard'), 'ContestScoreboard')
const Ranking = lazyNamed(() => import('@/features/ranking/pages/Ranking'), 'Ranking')
const LearningRoadmap = lazyNamed(() => import('@/features/roadmap/pages/LearningRoadmap'), 'LearningRoadmap')
const DiscussionList = lazyNamed(() => import('@/features/community/pages/DiscussionList'), 'DiscussionList')
const DiscussionDetail = lazyNamed(() => import('@/features/community/pages/DiscussionDetail'), 'DiscussionDetail')
const CreateDiscussion = lazyNamed(() => import('@/features/community/pages/CreateDiscussion'), 'CreateDiscussion')
const BlogList = lazyNamed(() => import('@/features/community/pages/BlogList'), 'BlogList')
const BlogDetail = lazyNamed(() => import('@/features/community/pages/BlogDetail'), 'BlogDetail')
const CreateArticle = lazyNamed(() => import('@/features/community/pages/CreateArticle'), 'CreateArticle')
const EditArticle = lazyNamed(() => import('@/features/community/pages/EditArticle'), 'EditArticle')
const DirectMessages = lazyNamed(() => import('@/features/community/pages/DirectMessages'), 'DirectMessages')
const SearchResults = lazyNamed(() => import('@/features/search/pages/SearchResults'), 'SearchResults')
const Profile = lazyNamed(() => import('@/features/settings/pages/Profile'), 'Profile')
const Settings = lazyNamed(() => import('@/features/settings/pages/Settings'), 'Settings')
const ClassManagement = lazyNamed(() => import('@/features/classes/pages/ClassManagement'), 'ClassManagement')
const AssignmentReport = lazyNamed(() => import('@/features/classes/pages/AssignmentReport'), 'AssignmentReport')
const ContestWizard = lazyNamed(() => import('@/features/contests/pages/ContestWizard'), 'ContestWizard')
const AdminDashboard = lazyNamed(() => import('@/features/admin/pages/AdminDashboard'), 'AdminDashboard')
const UserManagement = lazyNamed(() => import('@/features/admin/pages/UserManagement'), 'UserManagement')
const ProblemManagement = lazyNamed(() => import('@/features/admin/pages/ProblemManagement'), 'ProblemManagement')
const JudgeSettings = lazyNamed(() => import('@/features/admin/pages/JudgeSettings'), 'JudgeSettings')
const ProblemContentConfig = lazyNamed(() => import('@/features/admin/pages/ProblemContentConfig'), 'ProblemContentConfig')
const SimilarityScanConfig = lazyNamed(() => import('@/features/admin/pages/SimilarityScanConfig'), 'SimilarityScanConfig')
const PlagiarismReportList = lazyNamed(() => import('@/features/admin/pages/PlagiarismReportList'), 'PlagiarismReportList')
const PlagiarismReportDetail = lazyNamed(() => import('@/features/admin/pages/PlagiarismReportDetail'), 'PlagiarismReportDetail')
const BatchOperations = lazyNamed(() => import('@/features/admin/pages/BatchOperations'), 'BatchOperations')
const JudgeQueue = lazyNamed(() => import('@/features/admin/pages/JudgeQueue'), 'JudgeQueue')
const GradeManagement = lazyNamed(() => import('@/features/admin/pages/GradeManagement'), 'GradeManagement')
const FeatureManagement = lazyNamed(() => import('@/features/admin/pages/FeatureManagement'), 'FeatureManagement')
const ClassFeatureSettings = lazyNamed(() => import('@/features/classes/pages/ClassFeatureSettings'), 'ClassFeatureSettings')

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

/**
 * Feature gate wrapper for routes.
 * Fail-open: shows children during loading to avoid layout shift.
 * When the feature is disabled, renders nothing (route disappears).
 */
function FeatureGateWrapper({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { enabled } = useFeatureEnabled(slug)
  return enabled ? <>{children}</> : null
}

/**
 * During loading, renders children (fail-open). After resolution,
 * delegates to FeatureGateWrapper for actual enable/disable check.
 */
function FeatureGateRoute({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { isLoading } = useFeatureEnabled(slug)
  if (isLoading) return <>{children}</>
  return <FeatureGateWrapper slug={slug}>{children}</FeatureGateWrapper>
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
          <Route path="/admin/classes" element={<Navigate to="/teacher/classes" replace />} />
          <Route path="/admin/plagiarism" element={<Navigate to="/admin/similarity-scan" replace />} />

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
            <Route path="messages" element={<FeatureGateRoute slug="direct_messages">{renderLazy(DirectMessages)}</FeatureGateRoute>} />
            <Route path="search" element={renderLazy(SearchResults)} />
            <Route path="profile" element={renderLazy(Profile)} />
            <Route path="settings" element={renderLazy(Settings)} />
            {/* Teacher routes — gated by role */}
            <Route path="teacher/classes" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ClassManagement)}</ProtectedRoute>} />
            <Route path="teacher/assignment-report" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(AssignmentReport)}</ProtectedRoute>} />
            <Route path="teacher/contest-wizard" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ContestWizard)}</ProtectedRoute>} />
            <Route path="teacher/problem-content" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ProblemContentConfig)}</ProtectedRoute>} />
            <Route path="batch-operations" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(BatchOperations)}</ProtectedRoute>} />
            <Route path="teacher/features" element={<ProtectedRoute allowedRoles={TEACHER_ROLES}>{renderLazy(ClassFeatureSettings)}</ProtectedRoute>} />
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
            <Route path="features" element={renderLazy(FeatureManagement)} />
            <Route path="problem-content" element={renderLazy(ProblemContentConfig)} />
            <Route path="similarity-scan" element={<FeatureGateRoute slug="plagiarism">{renderLazy(SimilarityScanConfig)}</FeatureGateRoute>} />
            <Route path="plagiarism-reports" element={<FeatureGateRoute slug="plagiarism">{renderLazy(PlagiarismReportList)}</FeatureGateRoute>} />
            <Route path="plagiarism-reports/:reportId" element={<FeatureGateRoute slug="plagiarism">{renderLazy(PlagiarismReportDetail)}</FeatureGateRoute>} />
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
