import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

const { mockUseProblems, mockCreateContest, mockAddProblem } = vi.hoisted(() => ({
  mockUseProblems: vi.fn(),
  mockCreateContest: vi.fn(),
  mockAddProblem: vi.fn(),
}))

vi.mock('@/features/problems/hooks/useProblems', () => ({
  useProblems: mockUseProblems,
}))

vi.mock('@/features/contests/services/contests', () => ({
  contestsService: {
    createContest: mockCreateContest,
    addProblem: mockAddProblem,
  },
}))

import { ContestWizard } from '../ContestWizard'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('ContestWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProblems.mockReturnValue({
      data: {
        problems: [
          {
            id: '3',
            title: 'Binary Search',
            description: '',
            difficulty: 'medium',
            tags: [],
            time_limit: 1000,
            memory_limit: 262144,
            points: 120,
            created_at: '',
            updated_at: '',
          },
        ],
      },
      isLoading: false,
    })
    mockCreateContest.mockResolvedValue({ id: 7 })
    mockAddProblem.mockResolvedValue({})
  })

  it('creates the contest and saves selected problems', async () => {
    const user = userEvent.setup()
    render(<ContestWizard />, { wrapper: createWrapper() })

    await user.type(screen.getByLabelText(/竞赛标题/), 'Release Cup')
    await user.type(screen.getByLabelText(/开始时间/), '2026-07-01T08:00')
    await user.type(screen.getByLabelText(/结束时间/), '2026-07-01T10:00')
    await user.click(screen.getByLabelText(/Binary Search/))
    await user.clear(screen.getByLabelText('分数'))
    await user.type(screen.getByLabelText('分数'), '150')
    await user.click(screen.getByRole('button', { name: /发布竞赛/ }))

    await waitFor(() => {
      expect(mockCreateContest).toHaveBeenCalled()
      expect(mockAddProblem).toHaveBeenCalledWith(7, {
        problem_id: 3,
        category: '默认',
        points: 150,
        order_index: 1,
      })
    })
  })
})
