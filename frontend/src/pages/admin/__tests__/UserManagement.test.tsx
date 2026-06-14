import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/test-utils'
import { UserManagement } from '../UserManagement'

// Mock zustand store
const mockUser = {
  id: 'admin-uuid',
  username: 'admin',
  email: 'admin@test.com',
  display_name: 'Admin',
  organization_id: 1,
  campus_id: 2 as number | null,
  grade_id: null,
  role: 'root' as const,
  status: 'active',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
}

let storeState = {
  user: { ...mockUser } as typeof mockUser | null,
  isAuthenticated: true,
  isLoading: false,
  error: null as string | null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  checkAuth: vi.fn(),
}

vi.mock('@/shared/store/authStore', () => ({
  useAuthStore: () => storeState,
}))

// Mock admin service
vi.mock('@/services/admin', () => ({
  adminService: {
    getUsers: vi.fn().mockResolvedValue({
      users: [],
      total: 0,
    }),
    updateUserRole: vi.fn(),
    toggleUserStatus: vi.fn(),
    batchCreateUsers: vi.fn().mockResolvedValue({ created: [], skipped: [] }),
  },
}))

// Mock grades service with tracking
const mockListGrades = vi.fn().mockResolvedValue({
  grades: [
    { id: 1, campus_id: 2, name: 'Grade 10', year_level: 10, academic_year: '2024', is_active: true, created_at: '', updated_at: '' },
  ],
  total: 1,
})

vi.mock('@/services/grades', () => ({
  gradesService: {
    listGrades: (...args: number[]) => mockListGrades(...args),
  },
}))

describe('UserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default admin with campus_id=2
    storeState = {
      user: { ...mockUser, campus_id: 2 },
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      clearError: vi.fn(),
      checkAuth: vi.fn(),
    }
    mockListGrades.mockResolvedValue({
      grades: [
        { id: 1, campus_id: 2, name: 'Grade 10', year_level: 10, academic_year: '2024', is_active: true, created_at: '', updated_at: '' },
      ],
      total: 1,
    })
  })

  it('fetches grades using admin campus_id=2 from authStore', async () => {
    renderWithProviders(<UserManagement />)

    await waitFor(() => {
      expect(mockListGrades).toHaveBeenCalledWith(2)
    })
  })

  it('does not hardcode campus_id to 1 when admin has campus_id=2', async () => {
    renderWithProviders(<UserManagement />)

    await waitFor(() => {
      // The primary call should use campus_id=2, not 1
      expect(mockListGrades).not.toHaveBeenCalledWith(1)
      expect(mockListGrades).toHaveBeenCalledWith(2)
    })
  })

  it('handles admin with null campus_id gracefully', async () => {
    storeState.user = { ...mockUser, campus_id: null }

    renderWithProviders(<UserManagement />)

    // With null campus_id, the fallback (1) should be used
    await waitFor(() => {
      expect(mockListGrades).toHaveBeenCalledWith(1)
    })
  })

  it('fetches grades for campus 1 when admin has campus_id=1', async () => {
    storeState.user = { ...mockUser, campus_id: 1 }

    renderWithProviders(<UserManagement />)

    await waitFor(() => {
      expect(mockListGrades).toHaveBeenCalledWith(1)
    })
  })

  it('renders loading state then user table', async () => {
    renderWithProviders(<UserManagement />)

    // Should eventually render the page header (appears in both breadcrumb and h1)
    await waitFor(() => {
      expect(screen.getAllByText('用户管理').length).toBeGreaterThanOrEqual(2)
    })
  })
})
