import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ProblemSet } from '../ProblemSet'
import { problemsService } from '@/services/problems'

vi.mock('@/services/problems', () => ({
  problemsService: {
    getProblems: vi.fn(),
  },
}))

describe('ProblemSet', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProblemSet />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('loads problems from API and renders returned titles', async () => {
    vi.mocked(problemsService.getProblems).mockResolvedValue({
      problems: [
        {
          id: '9001',
          title: 'API Driven Problem',
          description: 'from backend',
          difficulty: 'medium',
          tags: ['Graph'],
          time_limit: 1000,
          memory_limit: 262144,
          points: 100,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      pages: 1,
    })

    renderComponent()

    await waitFor(() => {
      expect(problemsService.getProblems).toHaveBeenCalledWith({ limit: 20 })
      expect(screen.getAllByText('API Driven Problem').length).toBeGreaterThan(0)
      expect(screen.getAllByRole('link', { name: '进入' })[0]).toHaveAttribute('href', '/problems/9001')
      expect(screen.getByRole('button', { name: '全部方向' })).toHaveClass('h-12')
      expect(screen.getByRole('button', { name: '全部方向' })).toHaveClass('rounded-full')
      expect(screen.getByRole('button', { name: '查看真实筛选能力' }).className).toContain('h-12')
      expect(screen.getByRole('button', { name: /Graph/ })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '2' })).toBeNull()
    })
  })
})
