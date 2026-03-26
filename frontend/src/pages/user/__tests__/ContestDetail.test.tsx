import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContestDetail } from '../ContestDetail'

// Mock the API service
vi.mock('@/services/contests', () => ({
  contestsService: {
    getContestDetail: vi.fn(),
    registerContest: vi.fn(),
    enterContest: vi.fn(),
  },
}))

import { contestsService } from '@/services/contests'

describe('ContestDetail', () => {
  let queryClient: QueryClient

  const mockContest = {
    id: '1',
    name: 'Weekly Contest 345',
    description: 'Join us for our weekly coding challenge! This contest features 4 problems of varying difficulty.',
    start_time: '2024-01-15T10:00:00Z',
    end_time: '2024-01-15T12:00:00Z',
    duration_minutes: 120,
    status: 'upcoming',
    participants_count: 45,
    problems_count: 4,
    difficulty: 'medium',
    rules: '- No cheating\n- No external help\n- Time limit: 2 hours',
    prizes: '1st: $100, 2nd: $50, 3rd: $25',
    created_at: '2024-01-10T00:00:00Z',
    problems: [
      {
        id: '1',
        title: 'Two Sum',
        difficulty: 'easy',
        points: 10,
        accepted_count: 120,
        submission_count: 150,
      },
      {
        id: '2',
        title: 'Add Two Numbers',
        difficulty: 'medium',
        points: 20,
        accepted_count: 45,
        submission_count: 80,
      },
    ],
    is_registered: false,
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-12T10:00:00Z').getTime())
  })

  const renderComponent = (contestId: string = '1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/contests/${contestId}`]}>
          <Routes>
            <Route path="/contests/:contestId" element={<ContestDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(contestsService.getContestDetail).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('竞赛基本信息显示', () => {
    it('应该显示竞赛名称', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Weekly Contest 345' })).toBeInTheDocument()
      })
    })

    it('应该显示竞赛描述', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/weekly coding challenge/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示竞赛时间', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/2024.*01.*15/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/120.*分钟|2小时/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示竞赛状态', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/即将开始|upcoming/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('竞赛规则和奖励', () => {
    it('应该显示竞赛规则', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /竞赛规则|rules/i })).toBeInTheDocument()
        expect(screen.getByText(/no cheating/i)).toBeInTheDocument()
      })
    })

    it('应该显示奖励信息', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /奖励|prizes/i })).toBeInTheDocument()
        expect(screen.getByText(/\$100/i)).toBeInTheDocument()
      })
    })
  })

  describe('题目列表显示', () => {
    it('应该显示竞赛题目', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
        expect(screen.getByText('Add Two Numbers')).toBeInTheDocument()
      })
    })

    it('应该显示题目难度', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/简单|easy/i)).toBeInTheDocument()
        expect(screen.getAllByText(/中等|medium/i).length).toBeGreaterThan(0)
      })
    })

    it('应该显示题目分值', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/10.*分|points/i)).toBeInTheDocument()
        expect(screen.getByText(/20.*分|points/i)).toBeInTheDocument()
      })
    })

    it('应该显示题目统计信息', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/120 \/ 150|通过率 80%|pass rate/i).length).toBeGreaterThan(0)
      })
    })

    it('点击题目应该导航到题目页面', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
      })

      expect(screen.getByRole('link', { name: /Two Sum/i })).toHaveAttribute('href', '/problems/1')
    })
  })

  describe('注册功能', () => {
    it('未注册时应该显示注册按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        is_registered: false,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/立即注册|register|sign up/i)).toBeInTheDocument()
      })
    })

    it('点击注册按钮应该调用注册API', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        is_registered: false,
      })

      vi.mocked(contestsService.registerContest).mockResolvedValue({
        success: true,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/立即注册/i)).toBeInTheDocument()
      })

      const registerButton = screen.getByText(/立即注册/i)
      await user.click(registerButton)

      await waitFor(() => {
        expect(contestsService.registerContest).toHaveBeenCalledWith('1')
      })
    })

    it('已注册时应该显示已注册状态', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        is_registered: true,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/已注册|registered|✓/i)).toBeInTheDocument()
      })
    })
  })

  describe('进入竞赛功能', () => {
    it('进行中的竞赛应该显示进入按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        status: 'ongoing',
        is_registered: true,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /进入竞赛|enter/i })).toBeInTheDocument()
      })
    })

    it('点击进入按钮应该调用进入API', async () => {
      const user = userEvent.setup()

      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        status: 'ongoing',
        is_registered: true,
      })

      vi.mocked(contestsService.enterContest).mockResolvedValue({
        success: true,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/进入竞赛/i)).toBeInTheDocument()
      })

      const enterButton = screen.getByText(/进入竞赛/i)
      await user.click(enterButton)

      await waitFor(() => {
        expect(contestsService.enterContest).toHaveBeenCalledWith('1')
      })
    })
  })

  describe('倒计时功能', () => {
    it('即将开始的竞赛应该显示倒计时', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/3.*天|days.*hours|countdown/i)).toBeInTheDocument()
      })
    })

    it('进行中的竞赛应该显示剩余时间', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        status: 'ongoing',
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/剩余|即将结束|remaining|time left/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('参与人数显示', () => {
    it('应该显示参与人数', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/45.*人|participants/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示404错误（竞赛不存在）', async () => {
      vi.mocked(contestsService.getContestDetail).mockRejectedValue(
        new Error('Contest not found')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /not found|不存在/i })).toBeInTheDocument()
        expect(screen.getByText(/Contest not found/i)).toBeInTheDocument()
      })
    })

    it('应该显示通用错误消息', async () => {
      vi.mocked(contestsService.getContestDetail).mockRejectedValue(
        new Error('Failed to fetch contest')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /error|错误|failed|加载失败/i })).toBeInTheDocument()
        expect(screen.getByText(/Failed to fetch contest/i)).toBeInTheDocument()
      })
    })
  })

  describe('竞赛状态显示', () => {
    it('已结束的竞赛应该显示结果', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        status: 'completed',
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/已结束|completed|ended/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/查看结果|view results/i).length).toBeGreaterThan(0)
      })
    })
  })

  describe('分享功能', () => {
    it('应该提供分享按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        const shareButton = screen.getByRole('button', { name: /share|分享/i })
        expect(shareButton).toBeInTheDocument()
      })
    })
  })

  describe('返回导航', () => {
    it('应该提供返回按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back|返回/i })
        expect(backButton).toBeInTheDocument()
      })
    })
  })
})
