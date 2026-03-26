import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ContestWizard } from '../ContestWizard'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

describe('ContestWizard alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const localStorageMock = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    }
    vi.stubGlobal('localStorage', localStorageMock)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    })
    mockApi.get.mockResolvedValue({ data: [] })
    mockApi.post.mockResolvedValue({ data: {} })
    mockApi.put.mockResolvedValue({ data: {} })
    mockApi.delete.mockResolvedValue({ data: {} })
  })

  it('renders contest orchestration workspace in unified Chinese design language', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ContestWizard />
        </QueryClientProvider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '竞赛编排台' })).toBeInTheDocument()
      expect(screen.getByText('编排状态')).toBeInTheDocument()
      expect(screen.getByText('赛程时长')).toBeInTheDocument()
      expect(screen.getByText('已编排题目')).toBeInTheDocument()
      expect(screen.getByText('参赛者记录')).toBeInTheDocument()
      expect(screen.getByText('本场主控台')).toBeInTheDocument()
      expect(screen.getByText('编排进度')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '基础赛程' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '题目编排' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '参赛者预览' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '规则与发布' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '编排说明' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '创建竞赛并进入编排' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('例如：2026 春季算法联赛')).toBeInTheDocument()
    })
  })
})
