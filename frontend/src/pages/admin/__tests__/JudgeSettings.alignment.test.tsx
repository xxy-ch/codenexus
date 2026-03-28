import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { JudgeSettings } from '../JudgeSettings'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getTestCases: vi.fn(),
    getLanguageSettings: vi.fn(),
  },
}))

vi.mock('@/services/judgeConfig', () => ({
  judgeConfigService: {
    getTestCases: mocks.getTestCases,
    getLanguageSettings: mocks.getLanguageSettings,
    createTestCase: vi.fn(),
    deleteTestCase: vi.fn(),
    updateLanguageSettings: vi.fn(),
  },
}))

describe('JudgeSettings alignment', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mocks.getTestCases.mockResolvedValue([
      {
        id: 1,
        problem_id: 1001,
        input: '1 2',
        expected_output: '3',
        is_hidden: false,
        score: 10,
        order: 1,
        created_at: '2026-03-01T00:00:00Z',
      },
    ])

    mocks.getLanguageSettings.mockResolvedValue([
      { id: 'python', name: 'Python', extension: '.py', enabled: true, is_default: true },
      { id: 'c', name: 'C', extension: '.c', enabled: true, is_default: false },
      { id: 'cpp', name: 'C++', extension: '.cpp', enabled: false, is_default: false },
    ])
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <JudgeSettings />
      </QueryClientProvider>,
    )
  }

  it('uses shared management-scale controls and custom toggles instead of default browser inputs', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByPlaceholderText('输入题目 ID'), '1001')
    await user.click(screen.getByRole('button', { name: '加载' }))

    expect(await screen.findByLabelText('输入')).toBeInTheDocument()
    expect(screen.getByLabelText('预期输出')).toBeInTheDocument()
    expect(screen.getByLabelText('分值')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('checkbox', { name: '隐藏测试点' })).toBeNull()
    })
  })
})
