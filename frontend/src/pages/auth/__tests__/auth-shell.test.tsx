import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { NotFound } from '@/pages/error/NotFound'
import { ServerError } from '@/pages/error/ServerError'
import { SearchResults } from '@/pages/search/SearchResults'

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
    renderWithProviders(<LoginPage />)

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByText(/use your account identifier and password to enter the workspace/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders the redesigned register shell copy and recovery link', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByText(/set up your profile once and use it across problems classes and contests/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in instead/i })).toBeInTheDocument()
  })

  it('renders flat recovery messaging for unauthorized and error pages', () => {
    renderWithProviders(
      <>
        <UnauthorizedPage />
        <NotFound />
        <ServerError />
      </>,
    )

    expect(screen.getByRole('heading', { name: /you do not have access/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /server unavailable/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to dashboard/i })).toBeInTheDocument()
  })

  it('renders the redesigned search empty state when there is no query', () => {
    renderWithProviders(<SearchResults />, ['/search'])

    expect(screen.getByRole('heading', { name: /search the archive/i })).toBeInTheDocument()
    expect(screen.getByText(/search problems discussions and articles from one place/i)).toBeInTheDocument()
  })
})
