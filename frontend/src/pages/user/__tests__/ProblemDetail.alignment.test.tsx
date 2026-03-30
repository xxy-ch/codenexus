import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProblemDetail } from '../ProblemDetail'

describe('ProblemDetail alignment', () => {
  it('renders loading state initially', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          enabled: false, // Disable the query to keep it in loading state
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProblemDetail problemId="1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders error state when query fails', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          enabled: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProblemDetail problemId="" /> // Empty ID to trigger error
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Should show error state (either not found or auth required)
    expect(screen.getByText(/not found|authentication/i)).toBeInTheDocument()
  })
})
