import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SubmissionHistory } from '../SubmissionHistory'

vi.mock('@/services/problems', () => ({
  problemsService: {
    getUserSubmissions: vi.fn(),
  },
}))

import { problemsService } from '@/services/problems'

describe('SubmissionHistory alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
      submissions: [
        {
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
          updated_at: '2024-01-01T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('renders the submission workspace with hero stats and history pool language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SubmissionHistory />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '提交历史' })).toBeInTheDocument()
      expect(screen.getAllByText('提交工作台').length).toBeGreaterThan(0)
      expect(screen.getByText('当前概览')).toBeInTheDocument()
      expect(screen.getByText('总提交数')).toBeInTheDocument()
      expect(screen.getAllByText('已通过').length).toBeGreaterThan(0)
      expect(screen.getByText('待处理与其他')).toBeInTheDocument()
      expect(screen.getAllByText('提交记录池').length).toBeGreaterThan(0)
      expect(screen.getByText('语言筛选')).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '语言' })).toHaveClass('h-12')
      expect(screen.getByRole('combobox', { name: '语言' })).toHaveClass('rounded-[16px]')
      expect(screen.getAllByRole('button', { name: '已通过' })[0]).toHaveClass('h-12')
    })
  })
})
