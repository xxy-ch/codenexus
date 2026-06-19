import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ContestDetail } from '../ContestDetail'

const { mockGetContestDetail, mockRegisterContest, mockEnterContest, mockAddProblem, mockRemoveProblem } = vi.hoisted(() => ({
  mockGetContestDetail: vi.fn(),
  mockRegisterContest: vi.fn(),
  mockEnterContest: vi.fn(),
  mockAddProblem: vi.fn(),
  mockRemoveProblem: vi.fn(),
}))

// Mock the API service
vi.mock('@/features/contests/services/contests', () => ({
  contestsService: {
    getContestDetail: mockGetContestDetail,
    registerContest: mockRegisterContest,
    enterContest: mockEnterContest,
    addProblem: mockAddProblem,
    removeProblem: mockRemoveProblem,
  },
}))

vi.mock('@/features/problems/hooks/useProblems', () => ({
  useProblems: () => ({
    data: {
      problems: [
        {
          id: '1',
          title: 'Two Sum',
          description: '',
          difficulty: 'easy',
          tags: [],
          time_limit: 1000,
          memory_limit: 262144,
          points: 10,
          created_at: '',
          updated_at: '',
        },
      ],
    },
  }),
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'teacher-1', role: 'teacher' },
  }),
}))

import { contestsService } from '@/features/contests/services/contests'

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
        category: '基础题',
        points: 10,
        accepted_count: 120,
        submission_count: 150,
      },
      {
        id: '2',
        title: 'Add Two Numbers',
        difficulty: 'medium',
        category: '进阶题',
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
    it('应该显示骨架屏加载状态', () => {
      vi.mocked(contestsService.getContestDetail).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      // After Phase 15 polish, loading state uses DetailSkeleton (animate-pulse divs)
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('竞赛基本信息显示', () => {
    it('应该显示竞赛名称', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
      })
    })

    it('应该显示竞赛描述', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/weekly coding challenge/i)).toBeInTheDocument()
      })
    })

    it('应该显示竞赛时间', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('开始时间')).toBeInTheDocument()
        expect(screen.getByText('竞赛时长')).toBeInTheDocument()
        expect(screen.getByText(/2小时/)).toBeInTheDocument()
      })
    })

    it('应该显示竞赛状态', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/即将开始|upcoming/i)).toBeInTheDocument()
      })
    })
  })

  describe('竞赛规则和奖励', () => {
    it('应该显示竞赛规则', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/规则|rules/i)).toBeInTheDocument()
        expect(screen.getByText(/no cheating/i)).toBeInTheDocument()
      })
    })

    it('应该显示奖励信息', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/奖励|prizes/i)).toBeInTheDocument()
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
        // "简单" appears once (problem card), "中等" appears multiple times (header, detail, problem card)
        expect(screen.getAllByText('简单').length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText('中等').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('应该显示题目分值', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getAllByText(/10.*分|points/i).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(/20.*分|points/i).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('应该显示题目统计信息', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/通过率 80%/)).toBeInTheDocument()
        // accepted_count is a bare text node, submission_count is inside "/ N" span
        expect(screen.getByText('120')).toBeInTheDocument()
        expect(screen.getByText(/\/\s*150/)).toBeInTheDocument()
      })
    })

    it('点击题目应该导航到题目页面', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
      })

      const problemLink = screen.getByText('Two Sum').closest('a')
      expect(problemLink).toHaveAttribute('href', '/contests/1/problems/1/solve')
    })

    it('教师可以保存题目分类配置', async () => {
      const user = userEvent.setup()
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)
      vi.mocked(contestsService.addProblem).mockResolvedValue({
        id: 1,
        problem_id: 1,
        title: 'Two Sum',
        difficulty: 'easy',
        category: '算法基础',
        points: 30,
        order_index: 2,
      } as any)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('题目管理')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByLabelText('选择题目'), '1')
      await user.clear(screen.getByLabelText('题目分类'))
      await user.type(screen.getByLabelText('题目分类'), '算法基础')
      await user.clear(screen.getByLabelText('题目分数'))
      await user.type(screen.getByLabelText('题目分数'), '30')
      await user.clear(screen.getByLabelText('题目顺序'))
      await user.type(screen.getByLabelText('题目顺序'), '2')
      await user.click(screen.getByRole('button', { name: /保存/ }))

      await waitFor(() => {
        expect(contestsService.addProblem).toHaveBeenCalledWith('1', {
          problem_id: 1,
          category: '算法基础',
          points: 30,
          order_index: 2,
        })
      })
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
        expect(screen.getByText(/进入竞赛|enter|start/i)).toBeInTheDocument()
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
        expect(screen.getByText('即将开始')).toBeInTheDocument()
        expect(screen.getByText('竞赛时长')).toBeInTheDocument()
      })
    })

    it('进行中的竞赛应该显示剩余时间', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue({
        ...mockContest,
        status: 'ongoing',
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/剩余|remaining|time left/i)).toBeInTheDocument()
      })
    })
  })

  describe('参与人数显示', () => {
    it('应该显示参与人数', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/45.*人|participants/i)).toBeInTheDocument()
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示InlineError（竞赛不存在）', async () => {
      vi.mocked(contestsService.getContestDetail).mockRejectedValue(
        new Error('Contest not found')
      )

      renderComponent()

      await waitFor(() => {
        // InlineError renders title in h3
        expect(screen.getByRole('heading', { name: /加载失败/i })).toBeInTheDocument()
      })
    })

    it('应该显示InlineError通用错误', async () => {
      vi.mocked(contestsService.getContestDetail).mockRejectedValue(
        new Error('Failed to fetch contest')
      )

      renderComponent()

      await waitFor(() => {
        // InlineError renders with retry button
        expect(screen.getByRole('heading', { name: /加载失败/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()
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
        expect(screen.getByText('已结束')).toBeInTheDocument()
        expect(screen.getByText('查看榜单')).toBeInTheDocument()
      })
    })
  })

  describe('分享功能', () => {
    it('应该提供分享按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('分享')).toBeInTheDocument()
      })
    })
  })

  describe('返回导航', () => {
    it('应该提供返回按钮', async () => {
      vi.mocked(contestsService.getContestDetail).mockResolvedValue(mockContest)

      renderComponent()

      await waitFor(() => {
        // Lucide ArrowLeft renders as an SVG, find by the container button
        const backSvg = document.querySelector('svg.lucide-arrow-left')
        expect(backSvg).toBeInTheDocument()
        const backButton = backSvg?.closest('button')
        expect(backButton).toBeInTheDocument()
      })
    })
  })
})
