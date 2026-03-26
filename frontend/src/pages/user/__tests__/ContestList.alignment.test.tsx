import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContestList } from '../ContestList'

vi.mock('@/services/contests', () => ({
  contestsService: {
    getContests: vi.fn(),
  },
}))

import { contestsService } from '@/services/contests'

describe('ContestList alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-12T10:00:00Z').getTime())
    vi.mocked(contestsService.getContests).mockResolvedValue({
      contests: [
        {
          id: '1',
          name: '春季算法挑战赛',
          description: '偏向课堂训练与阶段冲榜的综合赛程。',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T12:00:00Z',
          duration_minutes: 120,
          status: 'upcoming',
          participants_count: 45,
          problems_count: 4,
          difficulty: 'medium',
          created_at: '2024-01-10T00:00:00Z',
        },
      ],
      total: 1,
    })
  })

  it('renders contest directory in a unified dense contest workspace language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ContestList />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '竞赛总览' })).toBeInTheDocument()
      expect(screen.getByText('当前焦点赛程')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '赛程检索' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '全部赛程池' })).toBeInTheDocument()
      expect(screen.getAllByText('总赛程数').length).toBeGreaterThan(0)
      expect(screen.getAllByText('直播赛程').length).toBeGreaterThan(0)
      expect(screen.getAllByText('待开赛程').length).toBeGreaterThan(0)
      expect(screen.getByRole('button', { name: '全部赛程' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '全部赛程' })).toHaveClass('h-12')
      expect(screen.getByPlaceholderText('搜索竞赛名称、方向或赛程标签')).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '难度' })).toHaveClass('h-12')
      expect(screen.getByRole('combobox', { name: '难度' })).toHaveClass('rounded-[16px]')
    })
  })
})
