import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SubmissionDetail } from '../SubmissionDetail'

vi.mock('@/services/problems', () => ({
  problemsService: {
    getSubmissionDetail: vi.fn(),
  },
}))

import { problemsService } from '@/services/problems'

describe('SubmissionDetail alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue({
      id: '1',
      problem_id: '1',
      problem_title: 'Two Sum',
      user_id: 'user1',
      username: 'solver',
      code: 'print(1)',
      language: 'python',
      status: 'accepted',
      time_ms: 45,
      memory_kb: 1024,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:05Z',
      test_cases: [
        {
          id: 1,
          input: '1 2',
          expected_output: '3',
          actual_output: '3',
          status: 'passed',
          time_ms: 15,
        },
      ],
    })
  })

  it('renders a Chinese diagnostic workspace for submission analysis', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/submissions/1']}>
          <Routes>
            <Route path="/submissions/:submissionId" element={<SubmissionDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '提交详情' })).toBeInTheDocument()
      expect(screen.getAllByText('判题诊断台').length).toBeGreaterThan(0)
      expect(screen.getByText('当前诊断')).toBeInTheDocument()
      expect(screen.getByText('判题状态')).toBeInTheDocument()
      expect(screen.getByText('测试点通过')).toBeInTheDocument()
      expect(screen.getByText('测试点池')).toBeInTheDocument()
      expect(screen.getByText('诊断侧栏')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '再次挑战' })).toBeInTheDocument()
    })
  })
})
