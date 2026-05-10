import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SubmissionDetail } from '../SubmissionDetail'

vi.mock('@/services/problems', () => ({
  problemsService: {
    getSubmissionDetail: vi.fn(),
  },
}))

vi.mock('@/components/analysis/AiCodeFeedback', () => ({
  AiCodeFeedback: () => <div data-testid="ai-code-feedback" />,
}))

vi.mock('@/components/analysis/SimilarSubmissions', () => ({
  SimilarSubmissions: () => <div data-testid="similar-submissions" />,
}))

import { problemsService } from '@/services/problems'

describe('SubmissionDetail', () => {
  let queryClient: QueryClient
  let writeTextMock: ReturnType<typeof vi.fn>

  const baseSubmission = {
    id: '1',
    problem_id: '1',
    problem_title: 'Two Sum',
    user_id: 'user1',
    username: 'testuser',
    code: '#include <iostream>\nint main() {\n  std::cout << "Hello World";\n  return 0;\n}',
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

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    vi.clearAllMocks()
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock,
      },
    } as unknown as Navigator)
  })

  const renderComponent = (submissionId = '1') =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/submissions/${submissionId}`]}>
          <Routes>
            <Route path="/submissions/:submissionId" element={<SubmissionDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

  it('显示骨架屏加载状态', () => {
    vi.mocked(problemsService.getSubmissionDetail).mockImplementation(() => new Promise(() => {}))

    renderComponent()

    // After Phase 15 polish, loading state uses DetailSkeleton (animate-pulse divs)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('渲染已通过提交的核心信息', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue(baseSubmission)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('判题结果')).toBeInTheDocument()
      expect(screen.getAllByText('45ms').length).toBeGreaterThan(0)
      expect(screen.getAllByText('1MB').length).toBeGreaterThan(0)
      // "2/2" is split across two <span> elements, so use a function matcher
      expect(screen.getByText((_content, element) => {
        return element?.tagName === 'P' && element?.textContent === '2/2'
      })).toBeInTheDocument()
      expect(screen.getByText(/testuser/)).toBeInTheDocument()
    })
  })

  it('渲染错误答案提交的测试细节', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue({
      ...baseSubmission,
      id: '2',
      status: 'wrong_answer',
      error_message: 'Wrong output',
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
    })

    renderComponent('2')

    await waitFor(() => {
      expect(screen.getAllByText(/Wrong Answer|答案错误/i).length).toBeGreaterThan(0)
      expect(screen.getByText('错误信息')).toBeInTheDocument()
      expect(screen.getAllByText(/Wrong output/i).length).toBeGreaterThan(0)
      expect(screen.getByText('期望输出')).toBeInTheDocument()
      expect(screen.getByText('实际输出')).toBeInTheDocument()
    })
  })

  it('渲染编译错误信息', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue({
      ...baseSubmission,
      status: 'compilation_error',
      error_message: "error: expected ';' before 'return'",
      test_cases: [],
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText(/Compilation Error|编译错误/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/expected ';' before 'return'/i)).toBeInTheDocument()
    })
  })

  it('渲染运行中状态并保留轮询态文案', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue({
      ...baseSubmission,
      status: 'running',
      test_cases: [],
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText(/Running|运行中/i).length).toBeGreaterThan(0)
      expect(screen.getByText('判题结果')).toBeInTheDocument()
    })
  })

  it('渲染等待中状态', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockResolvedValue({
      ...baseSubmission,
      status: 'pending',
      test_cases: [],
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText(/Pending|等待中/i).length).toBeGreaterThan(0)
    })
  })


  it('显示 not found 错误态', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockRejectedValue(new Error('submission not found'))

    renderComponent()

    await waitFor(() => {
      // InlineError renders error title in an h3 heading
      expect(screen.getByRole('heading', { name: /加载失败/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()
    })
  })

  it('显示通用加载失败错误态', async () => {
    vi.mocked(problemsService.getSubmissionDetail).mockRejectedValue(new Error('boom'))

    renderComponent()

    await waitFor(() => {
      // InlineError renders title + message
      expect(screen.getByRole('heading', { name: /加载失败/i })).toBeInTheDocument()
      expect(screen.getByText('boom')).toBeInTheDocument()
    })
  })
})
