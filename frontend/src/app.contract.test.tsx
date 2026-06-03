import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import App from './App'
import Login from './pages/auth/Login'
import DiscussionForum from './pages/community/DiscussionForum'
import { ToastProvider } from './components/ui/Toast'
import { useAuthStore } from './store/authStore'
import type { User } from './types/auth'

const { listDiscussionsMock } = vi.hoisted(() => ({
  listDiscussionsMock: vi.fn().mockResolvedValue({ discussions: [], total: 0 }),
}))

vi.mock('@/services/discussionsService', () => ({
  discussionsService: {
    list: listDiscussionsMock,
  },
}))

function renderWithProviders(ui: React.ReactElement, route = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

const nonAdminUser: User = {
  id: 'u-1',
  user_code: '1001',
  username: 'student',
  email: 'student@example.com',
  role: 'user',
  created_at: '2026-01-01T00:00:00Z',
}

describe('frontend contract regressions', () => {
  beforeEach(() => {
    listDiscussionsMock.mockResolvedValue({ discussions: [], total: 0 })
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  it('renders a dedicated unauthorized page for authenticated non-admin access', async () => {
    useAuthStore.setState({
      user: nonAdminUser,
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
    })

    renderWithProviders(<App />, '/admin')

    expect(await screen.findByRole('heading', { name: /访问被拒绝/i })).toBeInTheDocument()
  })

  it('does not expose a dead forgot-password link on the login page', () => {
    renderWithProviders(<Login />, '/login')

    expect(screen.queryByRole('link', { name: /忘记密码/i })).not.toBeInTheDocument()
  })

  it('does not expose a dead create-discussion link from the forum landing page', async () => {
    renderWithProviders(<DiscussionForum />, '/discussions')

    expect(await screen.findByRole('heading', { name: /讨论区/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /发起讨论/i })).not.toBeInTheDocument()
  })

  it('renders discussion items as read-only cards until a detail route exists', async () => {
    listDiscussionsMock.mockResolvedValue({
      discussions: [
        {
          id: 'd-1',
          title: '数组题怎么优化时间复杂度？',
          author_name: 'student',
          created_at: '2026-01-01T00:00:00Z',
          reply_count: 3,
          view_count: 10,
          tags: ['数组'],
        },
      ],
      total: 1,
    })

    renderWithProviders(<DiscussionForum />, '/discussions')

    expect(await screen.findByText(/数组题怎么优化时间复杂度？/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /数组题怎么优化时间复杂度？/i })).not.toBeInTheDocument()
    expect(screen.getByText(/详情即将开放/i)).toBeInTheDocument()
  })
})
