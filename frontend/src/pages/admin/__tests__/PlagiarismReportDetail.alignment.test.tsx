import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PlagiarismReportDetail } from '../PlagiarismReportDetail'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getReportDetail: vi.fn(),
  },
}))

vi.mock('@/services/plagiarism', () => ({
  plagiarismService: {
    getReportDetail: mocks.getReportDetail,
  },
}))

describe('PlagiarismReportDetail alignment', () => {
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

    mocks.getReportDetail.mockResolvedValue({
      id: 'rp-1',
      status: 'completed',
      overall_risk: 'high',
      created_at: '2026-03-24T12:00:00Z',
      finished_at: '2026-03-24T12:15:00Z',
      contest_id: 'c-8',
      assignment_id: null,
      total_submissions: 18,
      suspicious_pairs: 4,
      top_pairs: [
        {
          left_submission_id: 's-1',
          right_submission_id: 's-2',
          left_user: 'alice',
          right_user: 'bob',
          similarity: 0.92,
          matched_lines: 120,
        },
      ],
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/plagiarism-reports/rp-1']}>
          <Routes>
            <Route path="/admin/plagiarism-reports/:reportId" element={<PlagiarismReportDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('keeps the summary blocks on the shared card rhythm and uses honest detail copy', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('整体风险').parentElement?.className).toContain('rounded-[20px]')
      expect(screen.getByText('可疑提交对').closest('section')?.className).toContain('rounded-[24px]')
      expect(screen.getByText(/报告 rp-1/).textContent).toContain('rp-1')
    })
  })
})
