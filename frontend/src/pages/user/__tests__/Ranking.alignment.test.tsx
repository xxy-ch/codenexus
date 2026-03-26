import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Ranking } from '../Ranking'

vi.mock('@/services/ranking', () => ({
  rankingService: {
    getGlobalRanking: vi.fn(),
  },
}))

import { rankingService } from '@/services/ranking'

describe('Ranking alignment', () => {
  it('renders the global ranking page with podium and pool language from the reference', async () => {
    vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
      users: [
        {
          id: '1',
          username: 'AlphaCoder',
          email: '',
          first_name: '',
          last_name: '',
          ranking: 1,
          points: 980,
          problems_solved: 245,
          submissions: 302,
          accuracy: 81,
          school_name: '算法学院',
          avatar: null,
          created_at: '',
        },
        {
          id: '2',
          username: 'BetaCoder',
          email: '',
          first_name: '',
          last_name: '',
          ranking: 2,
          points: 930,
          problems_solved: 220,
          submissions: 288,
          accuracy: 76,
          school_name: '工程学院',
          avatar: null,
          created_at: '',
        },
        {
          id: '3',
          username: 'GammaCoder',
          email: '',
          first_name: '',
          last_name: '',
          ranking: 3,
          points: 902,
          problems_solved: 214,
          submissions: 276,
          accuracy: 74,
          school_name: '信息学院',
          avatar: null,
          created_at: '',
        },
        {
          id: '4',
          username: 'DeltaCoder',
          email: '',
          first_name: '',
          last_name: '',
          ranking: 4,
          points: 880,
          problems_solved: 205,
          submissions: 260,
          accuracy: 71,
          school_name: '理学院',
          avatar: null,
          created_at: '',
        },
      ],
      total: 4,
      page: 1,
      limit: 20,
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Ranking />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '全站排名' })).toBeInTheDocument()
      expect(screen.getAllByText('榜首三席').length).toBeGreaterThan(0)
      expect(screen.getAllByText('全局榜单池').length).toBeGreaterThan(0)
      expect(screen.getByText('本期焦点')).toBeInTheDocument()
      expect(screen.getByText('总榜席位')).toBeInTheDocument()
      expect(screen.getByText('榜首积分')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('搜索用户名、组织或排名席位')).toBeInTheDocument()
    })
  })
})
