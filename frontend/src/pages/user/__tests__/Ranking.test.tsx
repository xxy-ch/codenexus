import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Ranking } from '../Ranking'

// Mock the API service
vi.mock('@/services/ranking', () => ({
  rankingService: {
    getGlobalRanking: vi.fn(),
    getOrganizationRanking: vi.fn(),
    searchUsers: vi.fn(),
  },
}))

import { rankingService } from '@/services/ranking'

describe('Ranking', () => {
  let queryClient: QueryClient

  const mockRankingUsers = [
    {
      id: '1',
      username: 'algorithm_master',
      email: 'master@example.com',
      first_name: 'John',
      last_name: 'Doe',
      ranking: 1,
      points: 5420,
      problems_solved: 156,
      submissions: 342,
      accuracy: 45.6,
      school_id: '1',
      school_name: 'MIT',
      avatar: null,
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      username: 'code_ninja',
      email: 'ninja@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      ranking: 2,
      points: 4890,
      problems_solved: 142,
      submissions: 298,
      accuracy: 47.7,
      school_id: '2',
      school_name: 'Stanford',
      avatar: null,
      created_at: '2023-01-15T00:00:00Z',
    },
    {
      id: '3',
      username: 'bug_hunter',
      email: 'hunter@example.com',
      first_name: 'Bob',
      last_name: 'Johnson',
      ranking: 3,
      points: 4230,
      problems_solved: 128,
      submissions: 267,
      accuracy: 47.9,
      school_id: '3',
      school_name: 'Harvard',
      avatar: null,
      created_at: '2023-02-01T00:00:00Z',
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
          <Ranking />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(rankingService.getGlobalRanking).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('全局排行榜', () => {
    it('应该显示排行榜标题', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/排行榜|leaderboard|ranking/i)).toBeInTheDocument()
      })
    })

    it('应该正确显示用户排名列表', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('algorithm_master')).toBeInTheDocument()
        expect(screen.getByText('code_ninja')).toBeInTheDocument()
        expect(screen.getByText('bug_hunter')).toBeInTheDocument()
      })
    })

    it('应该显示排名数字', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('#1')).toBeInTheDocument()
        expect(screen.getByText('#2')).toBeInTheDocument()
        expect(screen.getByText('#3')).toBeInTheDocument()
      })
    })

    it('应该显示用户积分', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('5420')).toBeInTheDocument()
        expect(screen.getByText('4890')).toBeInTheDocument()
        expect(screen.getByText('4230')).toBeInTheDocument()
      })
    })

    it('应该显示解题数量和准确率', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/156.*题|solved/i)).toBeInTheDocument()
        expect(screen.getByText(/45\.6.*%|accuracy/i)).toBeInTheDocument()
      })
    })

    it('前三名应该有特殊样式', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        // 检查前三名是否有奖牌图标
        const medals = screen.getAllByTitle(/gold|silver|bronze|奖牌/i)
        expect(medals.length).toBeGreaterThanOrEqual(3)
      })
    })
  })

  describe('过滤功能', () => {
    it('应该支持按组织过滤', async () => {
      const user = userEvent.setup()

      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers.filter(u => u.school_id === '1'),
        total: 1,
        page: 1,
        limit: 20,
      })

      renderComponent()

      // 选择组织过滤
      const orgSelect = screen.getByLabelText(/组织|organization|school/i)
      await user.click(orgSelect)

      const mitOption = screen.getByText(/MIT/i)
      await user.click(mitOption)

      await waitFor(() => {
        expect(rankingService.getGlobalRanking).toHaveBeenCalledWith(
          expect.objectContaining({
            school_id: '1',
          })
        )
      })
    })

    it('应该支持按时间段过滤', async () => {
      const user = userEvent.setup()

      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      // 选择时间段过滤
      const timeFilter = screen.getByLabelText(/时间|time|period/i)
      await user.click(timeFilter)

      const thisWeekOption = screen.getByText(/本周|this week/i)
      await user.click(thisWeekOption)

      await waitFor(() => {
        expect(rankingService.getGlobalRanking).toHaveBeenCalledWith(
          expect.objectContaining({
            time_period: 'week',
          })
        )
      })
    })
  })

  describe('搜索功能', () => {
    it('应该支持搜索用户名', async () => {
      const user = userEvent.setup()

      vi.mocked(rankingService.searchUsers).mockResolvedValue({
        users: [mockRankingUsers[0]],
        total: 1,
      })

      renderComponent()

      const searchInput = screen.getByPlaceholderText(/搜索|search/i)
      await user.type(searchInput, 'algorithm_master')

      await waitFor(() => {
        expect(rankingService.searchUsers).toHaveBeenCalledWith('algorithm_master')
      })
    })

    it('应该显示搜索结果', async () => {
      vi.mocked(rankingService.searchUsers).mockResolvedValue({
        users: [mockRankingUsers[0]],
        total: 1,
      })

      renderComponent()

      const searchInput = screen.getByPlaceholderText(/搜索|search/i)
      await user.type(searchInput, 'algorithm')

      await waitFor(() => {
        expect(screen.getByText('algorithm_master')).toBeInTheDocument()
      })
    })
  })

  describe('分页功能', () => {
    it('应该支持分页导航', async () => {
      const user = userEvent.setup()

      // Mock 25 users to test pagination
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        ...mockRankingUsers[0],
        id: `${i + 1}`,
        username: `user_${i + 1}`,
        ranking: i + 1,
      }))

      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: manyUsers.slice(0, 20),
        total: 25,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/第.*页|page.*of/i)).toBeInTheDocument()
      })

      // 点击下一页
      const nextPageButton = screen.getByLabelText(/下一页|next/i)
      await user.click(nextPageButton)

      await waitFor(() => {
        expect(rankingService.getGlobalRanking).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        )
      })
    })
  })

  describe('用户详情交互', () => {
    it('点击用户应该显示用户详情', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('algorithm_master')).toBeInTheDocument()
      })

      const userRow = screen.getByText('algorithm_master').closest('tr')
      if (userRow) {
        const user = userEvent.setup()
        await user.click(userRow)

        // 验证显示用户详情
        expect(screen.getByText(/用户详情|user profile|profile/i)).toBeInTheDocument()
      }
    })

    it('应该显示用户的解题统计', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/156.*题|342.*次提交|45\.6.*%/i)).toBeInTheDocument()
      })
    })
  })

  describe('当前用户高亮', () => {
    it('应该高亮显示当前登录用户', async () => {
      // Mock current user
      vi.doMock('@/hooks/useAuth', () => ({
        useAuth: () => ({
          user: { id: '2' },
        }),
      }))

      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        const currentUserRow = screen.getByText('code_ninja').closest('tr')
        expect(currentUserRow).toHaveClass(/highlight|current|bg-primary/i)
      })
    })
  })

  describe空状态, () => {
    it('应该显示空状态消息', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/暂无排行|no ranking|empty/i)).toBeInTheDocument()
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示错误消息', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockRejectedValue(
        new Error('Failed to fetch ranking')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/加载失败|error|failed/i)).toBeInTheDocument()
      })
    })

    it('应该提供重试选项', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockRejectedValue(
        new Error('Failed to fetch ranking')
      )

      renderComponent()

      await waitFor(() => {
        const retryButton = screen.getByText(/重试|retry/i)
        expect(retryButton).toBeInTheDocument()
      })
    })
  })

  describe('实时更新', () => {
    it('应该支持实时排名更新', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('algorithm_master')).toBeInTheDocument()
      })

      // 检查是否有实时更新指示器
      const liveIndicator = screen.queryByTitle(/实时|live|auto.*update/i)
      expect(liveIndicator).toBeInTheDocument()
    })
  })

  describe('排行榜类型切换', () => {
    it('应该支持在全局排行和组织排行之间切换', async () => {
      const user = userEvent.setup()

      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/全局|global/i)).toBeInTheDocument()
      })

      // 切换到组织排行
      const orgTab = screen.getByText(/组织|organization/i)
      await user.click(orgTab)

      await waitFor(() => {
        expect(rankingService.getOrganizationRanking).toHaveBeenCalled()
      })
    })
  })

  describe('导出功能', () => {
    it('应该提供导出排行榜功能', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        const exportButton = screen.queryByLabelText(/导出|export|download/i)
        expect(exportButton).toBeInTheDocument()
      })
    })
  })

  describe('响应式设计', () => {
    it('应该在移动端正确显示', async () => {
      vi.mocked(rankingService.getGlobalRanking).mockResolvedValue({
        users: mockRankingUsers,
        total: 3,
        page: 1,
        limit: 20,
      })

      // 模拟移动端视口
      global.innerWidth = 375
      window.dispatchEvent(new Event('resize'))

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('algorithm_master')).toBeInTheDocument()
      })
    })
  })
})