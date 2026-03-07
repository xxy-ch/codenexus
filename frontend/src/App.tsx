import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { MainLayout } from './layouts/MainLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute'
import { AdminRoute } from './components/auth/AdminRoute'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage'
import { NotFound } from './pages/error/NotFound'
import { ServerError } from './pages/error/ServerError'
import { DashboardEnhanced } from './pages/user/DashboardEnhanced'
import { ProblemSet } from './pages/user/ProblemSet'
import { ProblemDetail } from './pages/user/ProblemDetail'
import { ProblemIDEEnhanced } from './pages/user/ProblemIDEEnhanced'
import { SubmissionHistory } from './pages/user/SubmissionHistory'
import { SubmissionDetail } from './pages/user/SubmissionDetail'
import { ContestList } from './pages/user/ContestList'
import { ContestDetail } from './pages/user/ContestDetail'
import { ContestScoreboard } from './pages/contest/ContestScoreboard'
import { Ranking } from './pages/user/Ranking'
import { LearningRoadmap } from './pages/user/LearningRoadmap'
import { DiscussionList } from './pages/community/DiscussionList'
import { DiscussionDetail } from './pages/community/DiscussionDetail'
import { CreateDiscussion } from './pages/community/CreateDiscussion'
import { BlogList } from './pages/community/BlogList'
import { BlogDetail } from './pages/community/BlogDetail'
import { CreateArticle } from './pages/community/CreateArticle'
import { EditArticle } from './pages/community/EditArticle'
import { DirectMessages } from './pages/community/DirectMessages'
import { SearchResults } from './pages/search/SearchResults'
import { Profile } from './pages/user/Profile'
import { Settings } from './pages/user/Settings'
import { ClassManagement } from './pages/teacher/ClassManagement'
import { AssignmentReport } from './pages/teacher/AssignmentReport'
import { ContestWizard } from './pages/teacher/ContestWizard'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ProblemManagement } from './pages/admin/ProblemManagement'
import { JudgeSettings } from './pages/admin/JudgeSettings'
import { ProblemContentConfig } from './pages/admin/ProblemContentConfig'
import { SimilarityScanConfig } from './pages/admin/SimilarityScanConfig'
import { PlagiarismReportList } from './pages/admin/PlagiarismReportList'
import { PlagiarismReportDetail } from './pages/admin/PlagiarismReportDetail'
import { FEATURE_FLAGS } from './services/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
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
            <Route path="dashboard" element={<DashboardEnhanced />} />
            <Route path="problems" element={<ProblemSet />} />
            <Route path="problems/:problemId" element={<ProblemDetail />} />
            <Route path="problems/:problemId/solve" element={<ProblemIDEEnhanced />} />
            <Route path="submissions" element={<SubmissionHistory />} />
            <Route path="submissions/:submissionId" element={<SubmissionDetail />} />
            <Route path="contests" element={<ContestList />} />
            <Route path="contests/:contestId" element={<ContestDetail />} />
            <Route path="contests/:contestId/scoreboard" element={<ContestScoreboard />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="roadmap" element={<LearningRoadmap />} />
            <Route path="discussions" element={<DiscussionList />} />
            <Route path="discussions/new" element={<CreateDiscussion />} />
            <Route path="discussions/:problemId/new" element={<CreateDiscussion />} />
            <Route path="discussions/:id" element={<DiscussionDetail />} />
            <Route path="blog" element={<BlogList />} />
            <Route path="blog/new" element={<CreateArticle />} />
            <Route path="blog/:slug" element={<BlogDetail />} />
            <Route path="blog/:slug/edit" element={<EditArticle />} />
            {FEATURE_FLAGS.directMessages && (
              <Route path="messages" element={<DirectMessages />} />
            )}
            <Route path="search" element={<SearchResults />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="teacher/classes" element={<ClassManagement />} />
            <Route path="teacher/assignment-report" element={<AssignmentReport />} />
            <Route path="teacher/contest-wizard" element={<ContestWizard />} />
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
            <Route index element={<AdminDashboard />} />
            <Route path="problems" element={<ProblemManagement />} />
            <Route path="judge-settings" element={<JudgeSettings />} />
            <Route path="problem-content" element={<ProblemContentConfig />} />
            {FEATURE_FLAGS.plagiarism && (
              <Route path="similarity-scan" element={<SimilarityScanConfig />} />
            )}
            {FEATURE_FLAGS.plagiarism && (
              <Route path="plagiarism-reports" element={<PlagiarismReportList />} />
            )}
            {FEATURE_FLAGS.plagiarism && (
              <Route path="plagiarism-reports/:reportId" element={<PlagiarismReportDetail />} />
            )}
          </Route>

          {/* Error Routes */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/500" element={<ServerError />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
