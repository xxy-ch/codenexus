import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeacherRoute } from '@/components/auth/TeacherRoute'

const mockProtectedRoute = vi.fn(({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => (
  <div data-allowed-roles={allowedRoles?.join(',')}>{children}</div>
))

vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: (props: { children: React.ReactNode; allowedRoles?: string[] }) => mockProtectedRoute(props),
}))

describe('TeacherRoute', () => {
  it('restricts teacher-only areas to teacher and admin roles', () => {
    render(
      <MemoryRouter>
        <TeacherRoute>
          <div>Teacher area</div>
        </TeacherRoute>
      </MemoryRouter>,
    )

    expect(screen.getByText('Teacher area')).toBeInTheDocument()
    expect(mockProtectedRoute).toHaveBeenCalled()
    expect(screen.getByText('Teacher area').parentElement).toHaveAttribute('data-allowed-roles', 'teacher,admin')
  })
})
