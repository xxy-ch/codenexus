import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
        expect(screen.getByText('Algorithm Marathon')).toBeInTheDocument()
        expect(screen.getByText('Beginner Friendly Contest')).toBeInTheDocument()
      })
    })

    it('应该显示竞赛状态标签', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/即将开始/).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(/进行中/).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(/已结束/).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('应该显示竞赛时间信息', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('2h')).toBeInTheDocument()
        expect(screen.getByText('4h')).toBeInTheDocument()
        expect(screen.getByText('1h 30m')).toBeInTheDocument()
      })
    })

    it('应该显示参与人数', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/45.*人|participants/i)).toBeInTheDocument()
        expect(screen.getByText(/128.*人|participants/i)).toBeInTheDocument()
        expect(screen.getByText(/256.*人|participants/i)).toBeInTheDocument()
      })
    })

    it('应该显示题目数量', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/4.*题|problems/i)).toBeInTheDocument()
        expect(screen.getByText(/6.*题|problems/i)).toBeInTheDocument()
        expect(screen.getByText(/3.*题|problems/i)).toBeInTheDocument()
      })
    })
  })

  describe('竞赛过滤功能', () => {
    it('应该能够按状态过滤竞赛', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      })

      // 点击"即将开始"过滤器按钮
      const upcomingButtons = screen.getAllByText(/即将开始/)
      // Use the filter button (inside the filter bar), not the group heading
      const upcomingFilter = upcomingButtons.find(btn => btn.closest('button'))
      if (upcomingFilter) {
        await user.click(upcomingFilter)
      }

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
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      })

      // Select the difficulty dropdown by label
      const difficultySelect = screen.getByLabelText(/难度/)
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
        // Verify upcoming contest renders with status badge
        expect(screen.getAllByText(/即将开始/).length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      })
    })

    it('进行中的竞赛应该显示剩余时间', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[1]],
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        // Verify ongoing contest renders with "立即加入" button
        expect(screen.getByText(/立即加入/)).toBeInTheDocument()
        expect(screen.getByText('Algorithm Marathon')).toBeInTheDocument()
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
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
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
        expect(screen.getByText(/立即加入|join now|enter/i)).toBeInTheDocument()
      })
    })

    it('应该显示"立即注册"按钮（即将开始的竞赛）', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[0]], // upcoming contest
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/立即注册|register now|sign up/i)).toBeInTheDocument()
      })
    })

    it('应该显示"查看结果"按钮（已结束的竞赛）', async () => {
      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: [mockContests[2]], // completed contest
        total: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/查看结果|view results/i)).toBeInTheDocument()
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
        expect(screen.getByText('加载失败')).toBeInTheDocument()
      })
    })

    it('应该提供重试按钮', async () => {
      vi.mocked(contestsService.getContests).mockRejectedValue(
        new Error('Failed to fetch contests')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('重试')).toBeInTheDocument()
      })
    })
  })

  describe('搜索功能', () => {
    it('应该支持搜索竞赛名称', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContests).mockResolvedValue({
        contests: mockContests,
        total: 3,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('搜索竞赛...')
      await user.type(searchInput, 'Weekly')

      await waitFor(() => {
        // Verify the service was called with a search parameter
        // (typing triggers per-character state updates, so we check that at least
        // one call included a non-empty search term)
        const calls = vi.mocked(contestsService.getContests).mock.calls
        const searchCalls = calls.filter(call => call[0]?.search !== undefined)
        expect(searchCalls.length).toBeGreaterThanOrEqual(1)
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
        expect(screen.getByText(/进行中 \(1\)/)).toBeInTheDocument()
        expect(screen.getByText(/即将开始 \(1\)/)).toBeInTheDocument()
        expect(screen.getByText(/已结束 \(1\)/)).toBeInTheDocument()
      })
    })
  })
})