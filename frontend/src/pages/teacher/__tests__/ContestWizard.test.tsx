import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('ContestWizard', () => {
  let queryClient: QueryClient

  function createLocalStorageMock() {
    const store = new Map<string, string>()

    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    const localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    })
    window.localStorage.clear()

    mockApi.get.mockImplementation(async (url: string) => {
      if (url === '/contests/42/problems') {
        return { data: [] }
      }
      if (url === '/contests/42/participants') {
        return { data: [] }
      }
      return { data: [] }
    })

    mockApi.post.mockImplementation(async (url: string, payload?: any) => {
      if (url === '/contests') {
        return { data: { id: 42, ...payload } }
      }
      if (url === '/contests/42/problems') {
        return { data: { id: 1, ...payload } }
      }
      return { data: {} }
    })

    mockApi.put.mockResolvedValue({ data: {} })
    mockApi.delete.mockResolvedValue({ data: {} })
  })

  function renderComponent() {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ContestWizard />
        </QueryClientProvider>
      </MemoryRouter>,
    )
  }

  it('creates a contest from step 1 and advances into the real problem step', async () => {
    renderComponent()

    fireEvent.change(screen.getByPlaceholderText('例如：Spring 2026 Coding Cup'), {
      target: { value: 'Spring Cup' },
    })

    fireEvent.change(screen.getByLabelText('开始时间'), { target: { value: '2026-03-20T10:00' } })
    fireEvent.change(screen.getByLabelText('结束时间'), { target: { value: '2026-03-20T12:00' } })

    fireEvent.click(screen.getByRole('button', { name: /创建竞赛并继续/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/contests', {
        organization_id: 1,
        campus_id: undefined,
        name: 'Spring Cup',
        description: '',
        rules: 'acm',
        start_time: new Date('2026-03-20T10:00').toISOString(),
        end_time: new Date('2026-03-20T12:00').toISOString(),
        freeze_minutes: 0,
      })
    })

    await waitFor(() => expect(screen.getByText('竞赛题目')).toBeInTheDocument())
    expect(screen.getByText('创建成功，竞赛 ID: 42')).toBeInTheDocument()
  })

  it('adds problems through the real contest problem route', async () => {
    window.localStorage.setItem(
      'teacher-contest-wizard-draft',
      JSON.stringify({
        activeStep: 2,
        createdContestId: 42,
        form: {
          organization_id: 1,
          name: 'Spring Cup',
          description: '',
          rules: 'acm',
          start_time: '2026-03-20T10:00:00.000Z',
          end_time: '2026-03-20T12:00:00.000Z',
          freeze_minutes: 0,
        },
        isPrivate: false,
        problemId: '',
        problemPoints: '100',
        problemOrderIndex: '1',
      }),
    )

    renderComponent()

    await waitFor(() => expect(screen.getByText('竞赛题目')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('题目 ID'), { target: { value: '1001' } })
    fireEvent.click(screen.getByRole('button', { name: /添加题目/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/contests/42/problems', {
        problem_id: 1001,
        points: 100,
        order_index: 1,
      })
    })
  })

  it('restores later steps, shows honest unsupported participant messaging, and saves supported settings', async () => {
    window.localStorage.setItem(
      'teacher-contest-wizard-draft',
      JSON.stringify({
        activeStep: 3,
        createdContestId: 42,
        form: {
          organization_id: 1,
          name: 'Spring Cup',
          description: '',
          rules: 'ioi',
          start_time: '2026-03-20T10:00:00.000Z',
          end_time: '2026-03-20T12:00:00.000Z',
          freeze_minutes: 30,
        },
        isPrivate: true,
        problemId: '',
        problemPoints: '100',
        problemOrderIndex: '1',
      }),
    )

    renderComponent()

    await waitFor(() => expect(screen.getByText('教师端直接管理未开放')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '下一步' }))

    await waitFor(() => expect(screen.getByText('规则与封榜')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /保存设置/i }))

    await waitFor(() => {
      expect(mockApi.put).toHaveBeenCalledWith('/contests/42', {
        rules: 'ioi',
        freeze_minutes: 30,
      })
    })
  })
})
