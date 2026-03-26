import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { UserManagement } from '../UserManagement'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getUsers: vi.fn(),
  },
}))

vi.mock('@/services/admin', () => ({
  adminService: {
    getUsers: mocks.getUsers,
    updateUserRole: vi.fn(),
    toggleUserStatus: vi.fn(),
    batchCreateUsers: vi.fn(),
  },
}))

describe('UserManagement control alignment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mocks.getUsers.mockResolvedValue({
      users: [
        {
          id: 'u-1',
          username: 'alice',
          display_name: 'Alice',
          email: 'alice@example.com',
          role: 'user',
          status: 'active',
          user_code: '240101070001',
          submissions_count: 12,
          problems_solved: 5,
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <UserManagement />
      </QueryClientProvider>,
    )
  }

  it('uses shared control styling for search, selects, sort actions, and password input', async () => {
    renderComponent()

    const search = await screen.findByRole('searchbox', { name: '搜索用户' })
    expect(search.className).toContain('rounded-[14px]')

    const roleFilter = screen.getByLabelText('角色筛选')
    expect(roleFilter.className).toContain('appearance-none')

    const statusFilter = screen.getByLabelText('状态筛选')
    expect(statusFilter.className).toContain('appearance-none')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '最新' }).className).toContain('focus-visible:ring-2')
    })

    const defaultPassword = screen.getByLabelText('默认密码')
    expect(defaultPassword.className).toContain('rounded-[14px]')
  })
})
