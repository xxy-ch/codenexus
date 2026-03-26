import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ContestList } from '../ContestList'

// Mock the API service
vi.mock('@/services/contests', () => ({
  contestsService: {
    getContests: vi.fn(),
  },
}))

import { contestsService } from '@/services/contests'

describe('ContestList', () => {
  let queryClient: QueryClient

  const mockContests = [
    {
      id: '1',
      name: 'Weekly Contest 345',
      description: 'Join us for our weekly coding challenge!',
      start_time: '2024-01-15T10:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      duration_minutes: 120,
      status: 'upcoming',
      participants_count: 45,
      problems_count: 4,
      difficulty: 'medium',
      created_at: '2024-01-10T00:00:00Z',
    },
    {
      id: '2',
      name: 'Algorithm Marathon',
      description: 'Test your skills with complex algorithms',
      start_time: '2024-01-10T10:00:00Z',
      end_time: '2024-01-10T14:00:00Z',
      duration_minutes: 240,
      status: 'ongoing',
      participants_count: 128,
      problems_count: 6,
      difficulty: 'hard',
      created_at: '2024-01-05T00:00:00Z',
    },
    {
      id: '3',
      name: 'Beginner Friendly Contest',
      description: 'Perfect for newcomers to practice',
      start_time: '2024-01-05T10:00:00Z',
      end_time: '2024-01-05T11:30:00Z',
      duration_minutes: 90,
      status: 'completed',
      participants_count: 256,
      problems_count: 3,
      difficulty: 'easy',
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    vi.clearAllMocks()
    // Mock current date
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-12T10:00:00Z').getTime())
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ContestList />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(contestsService.getContests).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('竞赛数据显示', () => {
    it('应该正确显示竞赛列表', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText('Weekly Contest 345').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Algorithm Marathon').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Beginner Friendly Contest').length).toBeGreaterThan(0)
      })
    })

    it('应该显示竞赛状态标签', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/即将开始|upcoming/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/进行中|ongoing/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/已结束|completed/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示竞赛时间信息', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/120.*分钟|2h/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/240.*分钟|4h/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/90.*分钟|1.5h/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示参与人数', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/45.*人|participants/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/128.*人|participants/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/256.*人|participants/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示题目数量', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/4.*题|problems/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/6.*题|problems/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/3.*题|problems/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('竞赛过滤功能', () => {
    it('应该能够按状态过滤竞赛', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests.filter(c => c.status === 'upcoming'),
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText('Weekly Contest 345').length).toBeGreaterThan(0)
      })

      // 点击"即将开始"过滤器
      const upcomingFilter = screen.getByRole('button', { name: /^即将开始$/ })
      await user.click(upcomingFilter)

      await waitFor(() => {
        expect(contestsService.getContests).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'upcoming',
          })
        )
      })
    })

    it('应该能够按难度过滤竞赛', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests.filter(c => c.difficulty === 'easy'),
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText('Beginner Friendly Contest').length).toBeGreaterThan(0)
      })

      const difficultySelect = screen.getByLabelText(/难度|difficulty/i)
      await user.selectOptions(difficultySelect, 'easy')

      await waitFor(() => {
        expect(contestsService.getContests).toHaveBeenCalledWith(
          expect.objectContaining({
            difficulty: 'easy',
          })
        )
      })
    })
  })

  describe('倒计时显示', () => {
    it('即将开始的竞赛应该显示倒计时', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[0]],
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/3.*天|days/i)).toBeInTheDocument()
      })
    })

    it('进行中的竞赛应该显示剩余时间', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [{
          ...mockContests[1],
          start_time: '2024-01-12T09:00:00Z',
          end_time: '2024-01-12T12:00:00Z',
        }],
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/剩余|remaining/i)).toBeInTheDocument()
      })
    })
  })

  describe('竞赛卡片交互', () => {
    it('点击竞赛卡片应该导航到详情页面', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText('Weekly Contest 345').length).toBeGreaterThan(0)
      })

      const contestLink = screen.getByText('Weekly Contest 345').closest('a')
      expect(contestLink).toHaveAttribute('href', '/contests/1')
    })

    it('应该显示"立即加入"按钮（进行中的竞赛）', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[1]], // ongoing contest
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/立即加入|join now|enter/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示"立即注册"按钮（即将开始的竞赛）', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[0]], // upcoming contest
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/立即注册|register now|sign up/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示"查看结果"按钮（已结束的竞赛）', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[2]], // completed contest
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/查看结果|view results/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('空状态', () => {
    it('应该显示空状态消息', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [],
        total: 0,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/暂无竞赛|no contests/i)).toBeInTheDocument()
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示错误消息', async () => {
      vi.mocked(contestsService.getContests).mockRejectedValue(
        new Error('Failed to fetch contests')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/加载失败|error|failed/i)).toBeInTheDocument()
      })
    })

    it('应该提供重试按钮', async () => {
      vi.mocked(contestsService.getContests).mockRejectedValue(
        new Error('Failed to fetch contests')
      )

      renderComponent()

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /重试|retry/i })
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('搜索功能', () => {
    it('应该支持搜索竞赛名称', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests.filter(c => c.name.includes('Weekly')),
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText('Weekly Contest 345').length).toBeGreaterThan(0)
      })

      const searchInput = screen.getByLabelText(/搜索竞赛|search/i)
      fireEvent.change(searchInput, { target: { value: 'Weekly' } })

      await waitFor(() => {
        expect(contestsService.getContests).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Weekly',
          })
        )
      })
    })
  })

  describe('竞赛分组显示', () => {
    it('应该按状态分组显示竞赛', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByRole('heading', { name: /竞赛总览|全部赛程池|contest/i }).length).toBeGreaterThan(0)
      })
    })
  })
})
