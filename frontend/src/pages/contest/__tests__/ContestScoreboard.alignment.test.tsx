import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContestScoreboard } from '../ContestScoreboard'

vi.mock('@/services/scoreboard', () => ({
  scoreboardService: {
    getContestScoreboard: vi.fn(),
  },
}))

import { scoreboardService } from '@/services/scoreboard'

describe('ContestScoreboard alignment', () => {
  it('renders a dense scoreboard workspace aligned with the contest reference language', async () => {
    vi.mocked(scoreboardService.getContestScoreboard).mockResolvedValue([
      {
        user_id: 'u1',
        username: 'AlphaCoder',
        score: 300,
        penalty: 42,
        solved_count: 3,
        submissions: [
          {
            problem_id: 1,
            problem_title: '图论起步',
            score: 100,
            attempts: 1,
            time_penalty: 12,
          },
        ],
      },
    ])

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/contests/1/scoreboard']}>
          <Routes>
            <Route path="/contests/:contestId/scoreboard" element={<ContestScoreboard />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('竞赛榜单台').length).toBeGreaterThan(0)
      expect(screen.getByText('榜单概览')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '实时榜单' })).toBeInTheDocument()
      expect(screen.getAllByText('刷新窗口').length).toBeGreaterThan(0)
      expect(screen.getAllByText('榜单来源').length).toBeGreaterThan(0)
      expect(screen.getAllByText('计分模式').length).toBeGreaterThan(0)
      expect(screen.getByText('实时排名池')).toBeInTheDocument()
    })
  })
})
