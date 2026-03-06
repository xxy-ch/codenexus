import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DashboardEnhanced } from '../DashboardEnhanced'
import type { UserActivity, RecommendedProblem } from '@/types/users'
import type { Problem } from '@/types/problems'

// Mock the API services
vi.mock('@/services/users', () => ({
  usersService: {
    getUserStats: vi.fn(),
    getUserActivity: vi.fn(),
    getRecommendedProblems: vi.fn(),
  },
}))

vi.mock('@/services/problems', () => ({
  problemsService: {
    getProblems: vi.fn(),
  },
}))

import { usersService } from '@/services/users'
import { problemsService } from '@/services/problems'

describe('DashboardEnhanced', () => {
  let queryClient: QueryClient

  const mockUserStats = {
    total_submissions: 150,
    accepted_submissions: 75,
    unique_problems_solved: 45,
    current_streak: 7,
    longest_streak: 14,
    ranking: 128,
    total_points: 1250,
    easy_solved: 20,
    medium_solved: 18,
    hard_solved: 7,
    accuracy_rate: 50,
  }

  const mockRecentActivity: UserActivity[] = [
    {
      id: '1',
      type: 'submission',
      problem_id: '1',
      problem_title: 'Two Sum',
      status: 'accepted',
      language: 'cpp',
      created_at: '2024-01-12T10:30:00Z',
    },
    {
      id: '2',
      type: 'contest_registration',
      contest_id: '1',
      contest_name: 'Weekly Contest 345',
      created_at: '2024-01-12T09:00:00Z',
    },
    {
      id: '3',
      type: 'submission',
      problem_id: '2',
      problem_title: 'Add Two Numbers',
      status: 'wrong_answer',
      language: 'python',
      created_at: '2024-01-11T15:20:00Z',
    },
  ]

  const mockRecommendedProblems: RecommendedProblem[] = [
    {
      id: '5',
      title: 'Reverse Linked List',
      difficulty: 'easy',
      tags: ['Linked List'],
      points: 15,
      acceptance_rate: 65,
      reason: 'based on your recent activity',
    },
    {
      id: '6',
      title: 'Merge Intervals',
      difficulty: 'medium',
      tags: ['Array', 'Sorting'],
      points: 25,
      acceptance_rate: 45,
      reason: 'popular medium difficulty problem',
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
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardEnhanced />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('用户统计信息', () => {
    it('应该显示基本统计数据', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/150.*次提交|submissions/i)).toBeInTheDocument()
        expect(screen.getByText(/45.*题|solved/i)).toBeInTheDocument()
        expect(screen.getByText(/50.*%|accuracy/i)).toBeInTheDocument()
      })
    })

    it('应该显示当前连续天数', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/7.*天|streak/i)).toBeInTheDocument()
      })
    })

    it('应该显示用户排名', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/128|ranking/i)).toBeInTheDocument()
      })
    })

    it('应该显示积分', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/1250.*分|points/i)).toBeInTheDocument()
      })
    })

    it('应该显示难度分布', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/20.*简单|easy/i)).toBeInTheDocument()
        expect(screen.getByText(/18.*中等|medium/i)).toBeInTheDocument()
        expect(screen.getByText(/7.*困难|hard/i)).toBeInTheDocument()
      })
    })
  })

  describe('学习进度图表', () => {
    it('应该显示每日提交统计', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/学习进度|activity|progress/i)).toBeInTheDocument()
      })
    })

    it('应该显示最近7天的活动趋势', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/最近7天|last 7 days|past week/i)).toBeInTheDocument()
      })
    })
  })

  describe('推荐题目', () => {
    it('应该显示推荐题目列表', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getRecommendedProblems).mockResolvedValue(mockRecommendedProblems)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Reverse Linked List')).toBeInTheDocument()
        expect(screen.getByText('Merge Intervals')).toBeInTheDocument()
      })
    })

    it('应该显示推荐理由', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getRecommendedProblems).mockResolvedValue(mockRecommendedProblems)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/based on your recent activity/i)).toBeInTheDocument()
      })
    })

    it('应该显示题目难度和通过率', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getRecommendedProblems).mockResolvedValue(mockRecommendedProblems)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/65.*%|acceptance/i)).toBeInTheDocument()
        expect(screen.getByText(/45.*%|acceptance/i)).toBeInTheDocument()
      })
    })

    it('点击推荐题目应该导航到题目页面', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getRecommendedProblems).mockResolvedValue(mockRecommendedProblems)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Reverse Linked List')).toBeInTheDocument()
      })

      const problemLink = screen.getByText('Reverse Linked List').closest('a')
      expect(problemLink).toHaveAttribute('href', '/problems/5')
    })
  })

  describe('最近活动', () => {
    it('应该显示最近活动记录', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getUserActivity).mockResolvedValue(mockRecentActivity)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
        expect(screen.getByText('Weekly Contest 345')).toBeInTheDocument()
        expect(screen.getByText('Add Two Numbers')).toBeInTheDocument()
      })
    })

    it('应该显示活动类型', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getUserActivity).mockResolvedValue(mockRecentActivity)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/提交|submission|accepted/i)).toBeInTheDocument()
        expect(screen.getByText(/注册|registration|contest/i)).toBeInTheDocument()
      })
    })

    it('应该显示活动时间', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getUserActivity).mockResolvedValue(mockRecentActivity)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/10:30|jan.*12/i)).toBeInTheDocument()
      })
    })

    it('应该限制显示的活动数量', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(usersService.getUserActivity).mockResolvedValue(mockRecentActivity)

      renderComponent()

      await waitFor(() => {
        const activities = screen.getAllByText(/two sum|add two numbers|weekly contest/i)
        expect(activities.length).toBe(3)
      })
    })
  })

  describe('每日挑战', () => {
    it('应该显示每日挑战推荐', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(problemsService.getProblems).mockResolvedValue({
        problems: [
          {
            id: '10',
            title: 'Daily Challenge: Valid Parentheses',
            description: 'Given a string containing just parentheses, determine if it is valid.',
            difficulty: 'medium',
            tags: ['Stack', 'String'],
            points: 30,
            time_limit: 1000,
            memory_limit: 256,
            created_at: '2024-01-12T00:00:00Z',
            updated_at: '2024-01-12T00:00:00Z',
          },
        ] as Problem[],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/每日挑战|daily challenge/i)).toBeInTheDocument()
      })
    })
  })

  describe('成就系统', () => {
    it('应该显示用户成就', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue({
        ...mockUserStats,
        achievements: [
          { id: 'first_solve', name: '初出茅庐', description: '解决第一道题', icon: 'star', unlocked_at: '2024-01-01T00:00:00Z' },
          { id: 'streak_7', name: '坚持不懈', description: '连续学习7天', icon: 'local_fire_department', unlocked_at: '2024-01-12T00:00:00Z' },
        ],
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/初出茅庐|first solve/i)).toBeInTheDocument()
        expect(screen.getByText(/坚持不懈|streak/i)).toBeInTheDocument()
      })
    })

    it('应该显示成就解锁进度', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue({
        ...mockUserStats,
        total_achievements: 10,
        unlocked_achievements: 2,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/2.*10|achievements/i)).toBeInTheDocument()
      })
    })
  })

  describe('加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(usersService.getUserStats).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('错误处理', () => {
    it('应该显示错误消息', async () => {
      vi.mocked(usersService.getUserStats).mockRejectedValue(
        new Error('Failed to fetch user stats')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/加载失败|error|failed/i)).toBeInTheDocument()
      })
    })

    it('应该提供重试选项', async () => {
      vi.mocked(usersService.getUserStats).mockRejectedValue(
        new Error('Failed to fetch user stats')
      )

      renderComponent()

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|retry/i)
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('快速操作', () => {
    it('应该提供快速开始解题按钮', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/开始刷题|start practicing|continue/i)).toBeInTheDocument()
      })
    })

    it('应该提供查看竞赛按钮', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/查看竞赛|view contests|contests/i)).toBeInTheDocument()
      })
    })
  })

  describe('响应式设计', () => {
    it('应该在移动端正确显示', async () => {
      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      // 模拟移动端视口
      global.innerWidth = 375
      window.dispatchEvent(new Event('resize'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/45.*题|solved/i)).toBeInTheDocument()
      })
    })
  })

  describe('数据刷新', () => {
    it('应该支持手动刷新数据', async () => {
      const user = require('@testing-library/user-event').default
      const userEvent = user.setup()

      vi.mocked(usersService.getUserStats).mockResolvedValue(mockUserStats)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/150.*次提交/i)).toBeInTheDocument()
      })

      const refreshButton = screen.getByLabelText(/refresh|刷新/i)
      await userEvent.click(refreshButton)

      await waitFor(() => {
        expect(usersService.getUserStats).toHaveBeenCalledTimes(2)
      })
    })
  })
})
