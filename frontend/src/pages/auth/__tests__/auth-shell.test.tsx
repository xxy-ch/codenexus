import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/auth/LoginPage'
import { AccountRecoveryPage } from '@/pages/auth/AccountRecoveryPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { PrivacyPolicyPage } from '@/pages/legal/PrivacyPolicyPage'
import { SearchResults } from '@/pages/search/SearchResults'
import { TermsOfServicePage } from '@/pages/legal/TermsOfServicePage'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    isAuthenticated: false,
    isLoading: false,
  }),
}))

vi.mock('@/services/searchApi', () => ({
  searchApi: {
    search: vi.fn(),
  },
}))

function renderWithProviders(ui: React.ReactNode, initialEntries = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('auth and utility shells', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the redesigned login shell copy and primary actions', () => {
    const { container } = renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: /保持代码表达的精确度/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /欢迎回来/i })).toBeInTheDocument()
    expect(screen.getByText(/继续你的刷题、竞赛与课程协作流程/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /进入工作台/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByText(/或使用账号密码/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /找回账号/i })).toHaveAttribute('href', '/account-recovery')
    expect(screen.getByRole('link', { name: /立即注册/i })).toBeInTheDocument()

    const authCard = container.querySelector('[data-testid="login-card"]')
    expect(authCard).toHaveClass('md:min-h-[720px]')

    const rightColumn = container.querySelector('[data-testid="login-form-shell"]')
    expect(rightColumn).toHaveClass('justify-between')

    expect(container.querySelectorAll('[data-testid="login-input-shell"]')).toHaveLength(2)
    expect(container.querySelector('[data-testid="login-submit-icon"]')).toBeInTheDocument()
  })

  it('renders the redesigned register shell copy and recovery link', () => {
    const { container } = renderWithProviders(<RegisterPage />)

    expect(screen.getByRole('heading', { name: /创建你的账号/i })).toBeInTheDocument()
    expect(screen.getByText(/补齐基础资料后，即可在题库、课堂与竞赛场景中直接使用/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /创建账号/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /服务条款/i })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: /隐私政策/i })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: /立即登录/i })).toBeInTheDocument()

    const registerCard = container.querySelector('[data-testid="register-card"]')
    expect(registerCard).toHaveClass('md:min-h-[720px]')

    const registerFormShell = container.querySelector('[data-testid="register-form-shell"]')
    expect(registerFormShell).toHaveClass('justify-between')
  })

  it('renders auth support and legal pages', () => {
    renderWithProviders(
      <>
        <AccountRecoveryPage />
        <TermsOfServicePage />
        <PrivacyPolicyPage />
      </>,
    )

    expect(screen.getByRole('heading', { name: /账号找回/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /服务条款/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /隐私政策/i })).toBeInTheDocument()
  })

  it('renders the redesigned search empty state when there is no query', () => {
    renderWithProviders(<SearchResults />, ['/search'])

    expect(screen.getByRole('heading', { name: /搜索内容库/i })).toBeInTheDocument()
    expect(screen.getByText(/从同一个入口搜索题目、讨论和文章/i)).toBeInTheDocument()
  })
})
