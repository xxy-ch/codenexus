import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { ProblemManagement } from '../ProblemManagement'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getProblems: vi.fn(),
  },
}))

vi.mock('@/services/admin', () => ({
  adminService: {
    getProblems: mocks.getProblems,
    createProblem: vi.fn(),
    updateProblem: vi.fn(),
    deleteProblem: vi.fn(),
  },
}))

describe('ProblemManagement control alignment', () => {
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

    mocks.getProblems.mockResolvedValue({
      problems: [
        {
          id: 'p-1',
          title: 'Two Sum',
          description: 'desc',
          difficulty: 'easy',
          status: 'published',
          visibility: 'public',
          tags: ['array'],
          submissions_count: 10,
          accepted_count: 8,
          author_username: 'admin',
          created_at: '2026-03-01T00:00:00Z',
          time_limit: 1000,
          memory_limit: 262144,
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
        <ProblemManagement />
      </QueryClientProvider>,
    )
  }

  it('keeps form and filter controls aligned to shared input/select/button styles', async () => {
    renderComponent()

    expect(await screen.findByLabelText('题目标题')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '搜索题目' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '难度筛选' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '状态筛选' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '最新' })).toBeInTheDocument()
    })
  })
})
