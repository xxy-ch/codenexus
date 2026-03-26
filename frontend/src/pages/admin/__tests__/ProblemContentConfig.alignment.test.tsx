import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProblemContentConfig } from '../ProblemContentConfig'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getProblem: vi.fn(),
  },
}))

vi.mock('@/services/judgeConfig', () => ({
  judgeConfigService: {
    getProblem: mocks.getProblem,
    updateProblem: vi.fn(),
  },
}))

describe('ProblemContentConfig alignment', () => {
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
    mocks.getProblem.mockResolvedValue({
      id: '1001',
      title: '排序统计',
      description: '题面内容',
      difficulty: 'medium',
      time_limit: 1000,
      memory_limit: 256,
      visibility: 'public',
      tags: ['sort'],
      is_public: true,
    })
  })

  it('keeps the editor controls on the shared input scale and replaces native checkbox feel', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <ProblemContentConfig />
      </QueryClientProvider>,
    )

    await user.type(screen.getByPlaceholderText('输入题目 ID'), '1001')
    await user.click(screen.getByRole('button', { name: '加载题目' }))

    const titleField = await screen.findByLabelText('题目标题')
    expect((titleField as HTMLInputElement).className).toContain('rounded-[18px]')

    const descriptionField = screen.getByLabelText('题目描述')
    expect((descriptionField as HTMLTextAreaElement).className).toContain('rounded-[18px]')

    const difficultyField = screen.getByLabelText('难度')
    expect(difficultyField.className).toContain('appearance-none')
    expect(difficultyField.className).toContain('rounded-[18px]')

    expect(screen.queryByRole('checkbox', { name: '公开题目' })).toBeNull()
  })
})
