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

    const titleInput = await screen.findByLabelText('题目标题')
    expect(titleInput.className).toContain('rounded-[14px]')

    const searchInput = screen.getByRole('searchbox', { name: '搜索题目' })
    expect(searchInput.className).toContain('rounded-[14px]')

    const difficultyFilter = screen.getByLabelText('难度筛选')
    expect(difficultyFilter.className).toContain('appearance-none')

    const statusFilter = screen.getByLabelText('状态筛选')
    expect(statusFilter.className).toContain('appearance-none')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '最新' }).className).toContain('focus-visible:ring-2')
    })
  })
})
