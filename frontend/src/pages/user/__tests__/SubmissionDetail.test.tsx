import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { SubmissionDetail } from '../SubmissionDetail'

// Mock the API service
vi.mock('@/services/problems', () => ({
  problemsService: {
    getSubmissionDetail: vi.fn(),
  },
}))

import { problemsService } from '@/services/problems'

describe('SubmissionDetail', () => {
  let queryClient: QueryClient

  const mockSubmission = {
    id: '1',
    problem_id: '1',
    problem_title: 'Two Sum',
    user_id: 'user1',
    username: 'testuser',
    code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello World";\n    return 0;\n}',
    language: 'cpp',
    status: 'accepted',
    time_ms: 45,
    memory_kb: 1024,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:05Z',
    test_cases: [
      {
        id: 1,
        input: '2 7 11 15\n9',
        expected_output: '0 1',
        actual_output: '0 1',
        status: 'passed',
        time_ms: 15,
      },
      {
        id: 2,
        input: '3 2 4\n6',
        expected_output: '1 2',
        actual_output: '1 2',
        status: 'passed',
        time_ms: 20,
      },
    ],
  }

  const mockWrongAnswerSubmission = {
    ...mockSubmission,
    id: '2',
    status: 'wrong_answer',
    test_cases: [
      {
        id: 1,
        input: '2 7 11 15\n9',
        expected_output: '0 1',
        actual_output: '1 2',
        status: 'failed',
        error: 'Wrong output',
        time_ms: 15,
      },
    ],
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
  })

  const renderComponent = (submissionId: string = '1') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/submissions/${submissionId}`]}>
          <SubmissionDetail />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  describe('初始加载状态', () => {
    it('应该显示加载状态', () => {
      vi.mocked(problemsService.getSubmissionDetail).mockImplementation(
        () => new Promise(() => {})
      )

      renderComponent()

      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument()
    })
  })

  describe('Accepted提交显示', () => {
    it('应该显示Accepted状态', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/accepted|通过/i)).toBeInTheDocument()
      })
    })

    it('应该显示题目信息', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Two Sum')).toBeInTheDocument()
        expect(screen.getByText(/cpp/i)).toBeInTheDocument()
      })
    })

    it('应该显示运行时间和内存', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/45ms/i)).toBeInTheDocument()
        expect(screen.getByText(/1MB/i)).toBeInTheDocument()
      })
    })

    it('应该显示代码内容', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/#include/)).toBeInTheDocument()
        expect(screen.getByText(/Hello World/)).toBeInTheDocument()
      })
    })

    it('应该显示测试用例结果', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/test case|测试用例/i)).toBeInTheDocument()
        expect(screen.getByText(/2.*2.*passed/)).toBeInTheDocument()
      })
    })
  })

  describe('Wrong Answer提交显示', () => {
    it('应该显示Wrong Answer状态', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(
        mockWrongAnswerSubmission
      )

      renderComponent('2')

      await waitFor(() => {
        expect(screen.getByText(/wrong answer|答案错误/i)).toBeInTheDocument()
      })
    })

    it('应该显示失败的测试用例详情', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(
        mockWrongAnswerSubmission
      )

      renderComponent('2')

      await waitFor(() => {
        expect(screen.getByText(/expected output|期望输出/i)).toBeInTheDocument()
        expect(screen.getByText(/actual output|实际输出/i)).toBeInTheDocument()
      })
    })

    it('应该显示错误信息', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(
        mockWrongAnswerSubmission
      )

      renderComponent('2')

      await waitFor(() => {
        expect(screen.getByText(/Wrong output/i)).toBeInTheDocument()
      })
    })
  })

  describe('其他提交状态', () => {
    it('应该显示Time Limit Exceeded状态', async () => {
      const tleSubmission = {
        ...mockSubmission,
        status: 'time_limit_exceeded',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(tleSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/time limit exceeded|超时/i)).toBeInTheDocument()
      })
    })

    it('应该显示Memory Limit Exceeded状态', async () => {
      const mleSubmission = {
        ...mockSubmission,
        status: 'memory_limit_exceeded',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mleSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/memory limit exceeded|内存超限/i)).toBeInTheDocument()
      })
    })

    it('应该显示Compilation Error状态', async () => {
      const ceSubmission = {
        ...mockSubmission,
        status: 'compilation_error',
        error_message: 'error: expected \';\' before \'return\'',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(ceSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/compilation error|编译错误/i)).toBeInTheDocument()
        expect(screen.getByText(/expected ';' before 'return'/i)).toBeInTheDocument()
      })
    })

    it('应该显示Runtime Error状态', async () => {
      const reSubmission = {
        ...mockSubmission,
        status: 'runtime_error',
        error_message: 'Segmentation fault',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(reSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/runtime error|运行时错误/i)).toBeInTheDocument()
        expect(screen.getByText(/Segmentation fault/i)).toBeInTheDocument()
      })
    })
  })

  describe('代码显示功能', () => {
    it('应该支持语法高亮', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        const codeElement = screen.getByText(/#include/)
        expect(codeElement).toBeInTheDocument()
        expect(codeElement.className).toContain('hljs') // 或其他语法高亮类名
      })
    })

    it('应该支持代码复制功能', async () => {
      const user = userEvent.setup()
      const writeText = vi.spyOn(navigator.clipboard, 'writeText')

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/#include/)).toBeInTheDocument()
      })

      const copyButton = screen.getByLabelText(/copy|复制/i)
      await user.click(copyButton)

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(mockSubmission.code)
        expect(screen.getByText(/copied|已复制/i)).toBeInTheDocument()
      })
    })
  })

  describe('测试用例展开', () => {
    it('应该默认展开第一个测试用例', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/test case 1|测试用例.*1/i)).toBeInTheDocument()
      })
    })

    it('应该支持展开/折叠测试用例', async () => {
      const user = userEvent.setup()

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/test case 1/i)).toBeInTheDocument()
      })

      const expandButton = screen.getByLabelText(/expand|展开/i)
      await user.click(expandButton)

      // 验证测试用例详情可见
      expect(screen.getByText('2 7 11 15')).toBeInTheDocument()
    })
  })

  describe('重新提交功能', () => {
    it('应该提供重新提交按钮', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/accepted/i)).toBeInTheDocument()
      })

      const resubmitButton = screen.getByText(/resubmit|重新提交|再次挑战/i)
      expect(resubmitButton).toBeInTheDocument()
    })
  })

  describe('返回功能', () => {
    it('应该提供返回按钮', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(mockSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/two sum/i)).toBeInTheDocument()
      })

      const backButton = screen.getByLabelText(/back|返回/i)
      expect(backButton).toBeInTheDocument()
    })
  })

  describe('错误处理', () => {
    it('应该显示404错误（提交不存在）', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockRejectedValue(
        new Error('Submission not found')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/not found|不存在/i)).toBeInTheDocument()
      })
    })

    it('应该显示通用错误消息', async () => {
      vi.mocked(problemsService.getSubmissionDetail).mockRejectedValue(
        new Error('Failed to fetch submission')
      )

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/error|错误|failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Pending和Running状态', () => {
    it('应该显示Pending状态的加载动画', async () => {
      const pendingSubmission = {
        ...mockSubmission,
        status: 'pending',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(pendingSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/pending|等待中/i)).toBeInTheDocument()
        expect(screen.getByRole('status')).toBeInTheDocument()
      })
    })

    it('应该显示Running状态', async () => {
      const runningSubmission = {
        ...mockSubmission,
        status: 'running',
      }

      vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(runningSubmission)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText(/running|运行中/i)).toBeInTheDocument()
      })
    })
  })
})