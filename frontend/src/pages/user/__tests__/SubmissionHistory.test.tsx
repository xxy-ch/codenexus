import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SubmissionHistory } from '../SubmissionHistory'

// Mock the API service
vi.mock('@/services/problems', () => ({
  problemsService: {
    getUserSubmissions: vi.fn(),
  },
}))

import { problemsService } from '@/services/problems'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{location.pathname}</div>
}

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
    {
      id: '3',
      problem_id: '1',
      problem_title: 'Two Sum',
      user_id: 'user1',
      code: 'int main() { return 0; }',
      language: 'cpp',
      status: 'queued',
      created_at: '2024-01-01T11:00:00Z',
      updated_at: '2024-01-01T11:00:01Z',
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
    window.scrollTo = vi.fn()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/submissions']}>
          <Routes>
            <Route
              path="/submissions"
              element={
                <>
                  <SubmissionHistory />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/submissions/:submissionId" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示骨架屏加载状态', () => {
      vi.mocked(problemsService.getUserSubmissions).mockImplementation(
        () => new Promise(() => {}) // 永不解决的Promise来模拟加载状态
      )

      renderComponent()

      // After Phase 15 polish, loading state uses TableSkeleton (animate-pulse divs) instead of text
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
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
        expect(screen.getAllByText('Two Sum').length).toBeGreaterThan(0)
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
        expect(screen.getAllByText(/accepted/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/wrong answer/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/queued/i).length).toBeGreaterThan(0)
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
        expect(screen.getAllByText(/1MB/i).length).toBeGreaterThan(0)
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
        expect(screen.getAllByText(/cpp|c\+\+/i).length).toBeGreaterThan(0)
        expect(screen.getAllByText(/python/i).length).toBeGreaterThan(0)
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
      const acceptedFilter = screen.getByRole('button', { name: /^Accepted$/i })
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
      await waitFor(() => {
        expect(screen.getByLabelText(/语言|language/i)).toBeInTheDocument()
      })

      const languageSelect = screen.getByLabelText(/语言|language/i)
      await user.selectOptions(languageSelect, 'cpp')

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
      const nextPageButton = screen.getByRole('button', { name: /下一页|next/i })
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
        expect(screen.getByRole('heading', { name: /加载失败/i })).toBeInTheDocument()
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
        expect(screen.getAllByText('Two Sum').length).toBeGreaterThan(0)
      })

      // 点击第一个提交记录
      const table = screen.getByRole('table')
      const firstBodyRow = within(table).getAllByRole('row')[1]
      const submissionRow = firstBodyRow.closest('tr')
      if (submissionRow) {
        await user.click(submissionRow)

        await waitFor(() => {
          expect(screen.getByTestId('location-probe')).toHaveTextContent('/submissions/1')
        })
      }
    })
  })
})
