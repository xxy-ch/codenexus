import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContestDetail } from '../ContestDetail'

vi.mock('@/services/contests', () => ({
  contestsService: {
    getContestDetail: vi.fn(),
    registerContest: vi.fn(),
    enterContest: vi.fn(),
  },
}))

import { contestsService } from '@/services/contests'

describe('ContestDetail alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-12T10:00:00Z').getTime())
    vi.mocked(contestsService.getContestDetail).mockResolvedValue({
      id: '1',
      name: '春季算法挑战赛',
      description: '四题综合赛程，覆盖图论、DP 与数据结构。',
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      duration_minutes: 120,
      status: 'upcoming',
      participants_count: 45,
      problems_count: 4,
      difficulty: 'medium',
      rules: '禁止协作\n支持赛后补题',
      prizes: '冠军奖学金积分 + 课程荣誉',
      created_at: '2024-01-10T00:00:00Z',
      problems: [
        {
          id: 'p1',
          title: '图论引导题',
          difficulty: 'easy',
          points: 100,
          accepted_count: 12,
          submission_count: 20,
        },
      ],
      is_registered: false,
    })
  })

  it('renders contest detail in a unified drill-down workspace language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/contests/1']}>
          <Routes>
            <Route path="/contests/:contestId" element={<ContestDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('竞赛主控台').length).toBeGreaterThan(0)
      expect(screen.getByText('赛程快照')).toBeInTheDocument()
      expect(screen.getByText('倒计时提示')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '赛程说明' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '题目编排' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '参赛指引' })).toBeInTheDocument()
      expect(screen.getAllByText('开始时间').length).toBeGreaterThan(0)
      expect(screen.getAllByText('赛程时长').length).toBeGreaterThan(0)
      expect(screen.getAllByText('题目数量').length).toBeGreaterThan(0)
      expect(screen.getAllByText('参赛人数').length).toBeGreaterThan(0)
    })
  })
})
