import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PlagiarismReportList } from '../PlagiarismReportList'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getReports: vi.fn(),
  },
}))

vi.mock('@/services/plagiarism', () => ({
  plagiarismService: {
    getReports: mocks.getReports,
  },
}))

describe('PlagiarismReportList alignment', () => {
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

    mocks.getReports.mockResolvedValue({
      total: 1,
      page: 1,
      limit: 20,
      reports: [
        {
          id: 'rp-1',
          status: 'completed',
          overall_risk: 'high',
          total_submissions: 18,
          suspicious_pairs: 4,
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
          <PlagiarismReportList />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('keeps the table header and action buttons on the management scale', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('报告 ID').className).toContain('text-[11px]')
      expect(screen.getByRole('link', { name: '查看详情' }).className).toContain('rounded-[16px]')
    })
  })
})
