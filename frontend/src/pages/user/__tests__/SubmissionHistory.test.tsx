import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SubmissionHistory } from '../SubmissionHistory'

// Mock the API service
vi.mock('@/services/problems', () => ({
  problemsService: {
    getUserSubmissions: vi.fn(),
  },
}))

import { problemsService } from '@/services/problems'

describe('SubmissionHistory', () => {
  let queryClient: QueryClient

  const mockSubmissions = [
    {
      id: '1',
      problem_id: '1',
      problem_title: 'Two Sum',
      user_id: 'user1',
      code: 'int main() { return 0; }',
      language: 'cpp',
      status: 'accepted',
      time_ms: 45,
      memory_kb: 1024,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:05Z',
    },
    {
      id: '2',
      problem_id: '2',
      problem_title: 'Add Two Numbers',
      user_id: 'user1',
      code: 'def solve(): pass',
      language: 'python',
      status: 'wrong_answer',
      time_ms: 120,
      memory_kb: 2048,
      error_message: 'Wrong output on test case 2',
      created_at: '2024-01-01T09:00:00Z',
      updated_at: '2024-01-01T09:00:03Z',
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
          <SubmissionHistory />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(problemsService.getUserSubmissions).mockImplementation(
        () => new Promise(() => {}) // 永不解决的Promise来模拟加载状态
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('数据显示', () => {
    it('应该正确显示提交列表', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
        total: 2,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
        expect(screen.getByText('Add Two Numbers')).toBeInTheDocument()
      })
    })

    it('应该显示提交状态标签', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
        total: 2,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/accepted|通过/i)).toBeInTheDocument()
        expect(screen.getByText(/wrong answer|答案错误/i)).toBeInTheDocument()
      })
    })

    it('应该显示运行时间和内存信息', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
        total: 2,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/45ms/i)).toBeInTheDocument()
        expect(screen.getByText(/1MB/i)).toBeInTheDocument()
        expect(screen.getByText(/120ms/i)).toBeInTheDocument()
        expect(screen.getByText(/2MB/i)).toBeInTheDocument()
      })
    })

    it('应该显示编程语言', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
        total: 2,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/cpp|c\+\+/i)).toBeInTheDocument()
        expect(screen.getByText(/python/i)).toBeInTheDocument()
      })
    })
  })

  describe('过滤功能', () => {
    it('应该能够按状态过滤提交', async () => {
      const user = userEvent.setup()

      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions.filter(s => s.status === 'accepted'),
        total: 1,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
      })

      // 点击状态过滤器
      const acceptedFilter = screen.getByText(/accepted|通过/i)
      await user.click(acceptedFilter)

      await waitFor(() => {
        expect(problemsService.getUserSubmissions).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'accepted',
          })
        )
      })
    })

    it('应该能够按语言过滤提交', async () => {
      const user = userEvent.setup()

      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions.filter(s => s.language === 'cpp'),
        total: 1,
        page: 1,
        limit: 20,
      })

      renderComponent()

      // 选择语言过滤器
      const languageSelect = screen.getByLabelText(/语言|language/i)
      await user.click(languageSelect)

      const cppOption = screen.getByText(/cpp|c\+\+/i)
      await user.click(cppOption)

      await waitFor(() => {
        expect(problemsService.getUserSubmissions).toHaveBeenCalledWith(
          expect.objectContaining({
            language: 'cpp',
          })
        )
      })
    })
  })

  describe('分页功能', () => {
    it('应该支持分页导航', async () => {
      const user = userEvent.setup()

      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
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
        expect(problemsService.getUserSubmissions).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        )
      })
    })
  })

  describe('空状态', () => {
    it('应该显示空状态消息', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: [],
        total: 0,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(
          screen.getByText(/暂无提交记录|no submissions/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('错误处理', () => {
    it('应该显示错误消息', async () => {
      vi.mocked(problemsService.getUserSubmissions).mockRejectedValue(
        new Error('Failed to fetch submissions')
      )

      renderComponent()

      await waitFor(() => {
        expect(
          screen.getByText(/加载失败|error|failed/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('点击提交记录', () => {
    it('点击提交记录应该导航到详情页面', async () => {
      const user = userEvent.setup()

      vi.mocked(problemsService.getUserSubmissions).mockResolvedValue({
        submissions: mockSubmissions,
        total: 2,
        page: 1,
        limit: 20,
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
      })

      // 点击第一个提交记录
      const submissionRow = screen.getByText('Two Sum').closest('tr')
      if (submissionRow) {
        await user.click(submissionRow)

        // 验证导航
        expect(window.location.pathname).toContain('/submissions/1')
      }
    })
  })
})