import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AdminRoute } from './components/auth/AdminRoute'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { PublicRoute } from './components/auth/PublicRoute'
import { TeacherRoute } from './components/auth/TeacherRoute'
import { FEATURE_FLAGS } from './services/config'
import { useAuthStore } from './store/authStore'
import type { User } from './types/auth'

function mockPage(label: string) {
  return { default: () => <div>{label}</div> }
}

vi.mock('./pages/auth/Login', () => mockPage('Login'))
vi.mock('./pages/auth/Register', () => mockPage('Register'))
vi.mock('./pages/user/Dashboard', () => mockPage('Dashboard'))
vi.mock('./pages/user/problems/ProblemList', () => mockPage('ProblemList'))
vi.mock('./pages/user/problems/ProblemDetail', () => mockPage('ProblemDetail'))
vi.mock('./pages/user/SubmissionHistory', () => mockPage('SubmissionHistory'))
vi.mock('./pages/user/UserRankings', () => mockPage('UserRankings'))
vi.mock('./pages/community/DiscussionForum', () => mockPage('DiscussionForum'))
vi.mock('./pages/contest/ContestList', () => mockPage('ContestList'))
vi.mock('./pages/contest/ContestDetail', () => mockPage('ContestDetail'))
vi.mock('./pages/user/OnlineIDE', () => mockPage('OnlineIDE'))
vi.mock('./pages/admin/AdminPanel', () => mockPage('AdminPanel'))
vi.mock('./pages/errors/Unauthorized', () => mockPage('Unauthorized'))
vi.mock('./pages/errors/NotFound', () => mockPage('NotFound'))

type MutableFeatureFlags = {
  directMessages: boolean
  plagiarism: boolean
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

const studentUser: User = {
  id: 'user-1',
  user_code: 'U1001',
  username: 'student',
  email: 'student@example.com',
  role: 'user',
  created_at: '2026-01-01T00:00:00Z',
}

const teacherUser: User = {
  ...studentUser,
  id: 'teacher-1',
  username: 'teacher',
  role: 'teacher',
}

const adminUser: User = {
  ...studentUser,
  id: 'admin-1',
  username: 'admin',
  role: 'admin',
}

const rootUser: User = {
  ...studentUser,
  id: 'root-1',
  username: 'root',
  role: 'root',
}

function resetAuthState() {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  })
}

function resetFeatureFlags() {
  Object.assign(FEATURE_FLAGS as MutableFeatureFlags, {
    directMessages: true,
    plagiarism: true,
  })
}

function setAuthenticatedUser(user: User) {
  useAuthStore.setState({
    user,
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    error: null,
  })
}

function renderAppAt(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function renderGuardHarness({
  initialEntry,
  guardedPath = '/secure',
  element,
}: {
  initialEntry: string | { pathname: string; state?: unknown }
  guardedPath?: string
  element: ReactNode
}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={guardedPath} element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/register" element={<div>Register Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        <Route path="/settings" element={<div>Settings Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('route primitives contract', () => {
  beforeEach(() => {
    resetAuthState()
    resetFeatureFlags()
  })

  it('redirects public login visits for authenticated users to the requested destination', async () => {
    setAuthenticatedUser(studentUser)

    renderGuardHarness({
      initialEntry: {
        pathname: '/login',
        state: { from: { pathname: '/settings' } },
      },
      guardedPath: '/login',
      element: <PublicRoute><div>Public Only</div></PublicRoute>,
    })

    expect(await screen.findByText('Settings Page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/settings')
  })

  it('redirects authenticated register visits to /dashboard without a stored destination', async () => {
    setAuthenticatedUser(studentUser)

    renderGuardHarness({
      initialEntry: '/register',
      guardedPath: '/register',
      element: <PublicRoute><div>Public Only</div></PublicRoute>,
    })

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
  })

  it('sends unauthorized admin access to /unauthorized', async () => {
    setAuthenticatedUser(studentUser)

    renderGuardHarness({
      initialEntry: '/secure',
      element: <AdminRoute><div>Admin Only</div></AdminRoute>,
    })

    expect(await screen.findByText('Unauthorized Page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/unauthorized')
  })

  it('allows teachers through the teacher route', async () => {
    setAuthenticatedUser(teacherUser)

    renderGuardHarness({
      initialEntry: '/secure',
      element: <TeacherRoute><div>Teacher Only</div></TeacherRoute>,
    })

    expect(await screen.findByText('Teacher Only')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/secure')
  })

  it('redirects unauthenticated protected visits to /login', async () => {
    renderGuardHarness({
      initialEntry: '/secure',
      element: <ProtectedRoute><div>Secure Only</div></ProtectedRoute>,
    })

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('keeps legacy feature flags enabled by default', () => {
    expect(FEATURE_FLAGS.directMessages).toBe(true)
    expect(FEATURE_FLAGS.plagiarism).toBe(true)
  })
})

describe('legacy route inventory contract', () => {
  beforeEach(() => {
    resetAuthState()
    resetFeatureFlags()
  })

  it('redirects / to /dashboard for authenticated users', async () => {
    setAuthenticatedUser(studentUser)

    renderAppAt('/')

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
    })
  })

  it.each([
    '/account-recovery',
    '/terms',
    '/privacy',
    '/unauthorized',
    '/500',
  ])('exposes public legacy route %s', async (route) => {
    renderAppAt(route)

    expect(await screen.findByTestId('location')).not.toHaveTextContent('/404')
  })

  it.each([
    '/dashboard',
    '/problems',
    '/problems/problem-1',
    '/problems/problem-1/solve',
    '/submissions',
    '/submissions/submission-1',
    '/contests',
    '/contests/contest-1',
    '/contests/contest-1/scoreboard',
    '/ranking',
    '/roadmap',
    '/profile',
    '/settings',
    '/discussions',
    '/discussions/new',
    '/discussions/problem-1/new',
    '/discussions/discussion-1',
    '/blog',
    '/blog/new',
    '/blog/post-1',
    '/blog/post-1/edit',
    '/messages',
    '/search',
  ])('exposes authenticated workspace route %s', async (route) => {
    setAuthenticatedUser(studentUser)

    renderAppAt(route)

    expect(await screen.findByTestId('location')).not.toHaveTextContent('/404')
  })

  it.each([
    '/teacher/classes',
    '/teacher/assignment-report',
    '/teacher/contest-wizard',
  ])('exposes teacher route %s', async (route) => {
    setAuthenticatedUser(teacherUser)

    renderAppAt(route)

    expect(await screen.findByTestId('location')).not.toHaveTextContent('/404')
  })

  it.each([
    '/admin',
    '/admin/users',
    '/admin/problems',
    '/admin/judge-settings',
    '/admin/problem-content',
    '/admin/similarity-scan',
    '/admin/plagiarism-reports',
    '/admin/plagiarism-reports/report-1',
  ])('exposes admin route %s', async (route) => {
    setAuthenticatedUser(adminUser)

    renderAppAt(route)

    expect(await screen.findByTestId('location')).not.toHaveTextContent('/404')
  })

  it('allows root users through admin routes', async () => {
    setAuthenticatedUser(rootUser)

    renderAppAt('/admin')

    expect(await screen.findByTestId('location')).not.toHaveTextContent('/unauthorized')
    expect(screen.getByTestId('location')).not.toHaveTextContent('/404')
  })

  it('hides /messages when the direct-messages flag is disabled', async () => {
    Object.assign(FEATURE_FLAGS as MutableFeatureFlags, { directMessages: false })
    setAuthenticatedUser(studentUser)

    renderAppAt('/messages')

    expect(await screen.findByText('NotFound')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/404')
  })

  it.each([
    '/admin/similarity-scan',
    '/admin/plagiarism-reports',
    '/admin/plagiarism-reports/report-1',
  ])('hides plagiarism route %s when the plagiarism flag is disabled', async (route) => {
    Object.assign(FEATURE_FLAGS as MutableFeatureFlags, { plagiarism: false })
    setAuthenticatedUser(adminUser)

    renderAppAt(route)

    expect(await screen.findByText('NotFound')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/404')
  })

  it('routes unknown paths to the 404 surface', async () => {
    renderAppAt('/definitely-not-real')

    expect(await screen.findByText('NotFound')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/404')
  })
})
