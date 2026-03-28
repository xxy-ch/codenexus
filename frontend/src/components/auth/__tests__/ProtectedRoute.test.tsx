import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

const authState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  user: null as null | { role: string },
  nextCheckAuthResult: false,
  nextAuthenticated: false,
  nextUser: null as null | { role: string },
  checkAuth: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    checkAuth: authState.checkAuth,
  }),
}))

function renderRoute(allowedRoles?: string[]) {
  return render(
    <MemoryRouter initialEntries={['/secure']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        <Route
          path="/secure"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Secure Area</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authState.isAuthenticated = false
    authState.isLoading = false
    authState.user = null
    authState.nextCheckAuthResult = false
    authState.nextAuthenticated = false
    authState.nextUser = null
    authState.checkAuth.mockImplementation(async () => {
      authState.isAuthenticated = authState.nextAuthenticated
      authState.user = authState.nextUser
      return authState.nextCheckAuthResult
    })
  })

  it('redirects to login when checkAuth rejects the session', async () => {
    authState.nextCheckAuthResult = false

    renderRoute()

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument()
    })
    expect(authState.checkAuth).toHaveBeenCalled()
  })

  it('redirects to unauthorized when the authenticated role is not allowed', async () => {
    authState.nextCheckAuthResult = true
    authState.nextAuthenticated = true
    authState.nextUser = { role: 'student' }

    renderRoute(['admin'])

    await waitFor(() => {
      expect(screen.getByText('Unauthorized Page')).toBeInTheDocument()
    })
    expect(authState.checkAuth).toHaveBeenCalled()
  })

  it('renders protected content when the session is valid and the role matches', async () => {
    authState.nextCheckAuthResult = true
    authState.nextAuthenticated = true
    authState.nextUser = { role: 'teacher' }

    renderRoute(['teacher', 'admin'])

    await waitFor(() => {
      expect(screen.getByText('Secure Area')).toBeInTheDocument()
    })
    expect(authState.checkAuth).toHaveBeenCalled()
  })
})
