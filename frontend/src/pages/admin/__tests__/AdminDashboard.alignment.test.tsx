import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AdminDashboard } from '../AdminDashboard'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getUsers: vi.fn(),
    getProblems: vi.fn(),
    getReports: vi.fn(),
  },
}))

vi.mock('@/services/admin', () => ({
  adminService: {
    getUsers: mocks.getUsers,
    getProblems: mocks.getProblems,
  },
}))

vi.mock('@/services/plagiarism', () => ({
  plagiarismService: {
    getReports: mocks.getReports,
  },
}))

describe('AdminDashboard alignment', () => {
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

    mocks.getUsers
      .mockResolvedValueOnce({ total: 1240, page: 1, limit: 1, users: [] })
      .mockResolvedValueOnce({ total: 910, page: 1, limit: 1, users: [] })
    mocks.getProblems.mockResolvedValue({ total: 286, page: 1, limit: 1, problems: [] })
    mocks.getReports.mockResolvedValue({
      total: 3,
      page: 1,
      limit: 4,
      reports: [
        {
          id: 'rp-1',
          status: 'pending',
          overall_risk: 'high',
          total_submissions: 12,
          suspicious_pairs: 3,
          contest_id: 'c-8',
          assignment_id: null,
          created_at: '2026-03-24T12:00:00Z',
        },
      ],
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('renders metric cards, quick management, security alert, and audit feed like the reference layout', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '系统概览' })).toBeInTheDocument()
      expect(screen.getByText('快速管理')).toBeInTheDocument()
      expect(screen.getByText('安全提醒')).toBeInTheDocument()
      expect(screen.getAllByText('审计日志').length).toBeGreaterThan(0)
      expect(screen.getByRole('link', { name: /题目管理/ })).toBeInTheDocument()
    })
  })
})
