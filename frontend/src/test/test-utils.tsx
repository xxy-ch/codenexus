import React from 'react'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Re-export everything from testing libraries for convenience
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

/**
 * Creates a fresh QueryClient suitable for testing.
 * - retry: false prevents flaky retry behavior in tests
 * - gcTime: 0 ensures no cache leaking between tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

interface RenderWithProvidersOptions {
  route?: string
}

/**
 * Renders a React element wrapped with QueryClientProvider and MemoryRouter.
 * Each call gets a fresh QueryClient to prevent cache leaking between tests.
 *
 * @param ui - The React element to render
 * @param options - Optional configuration
 * @param options.route - Initial route path for MemoryRouter (default: '/')
 * @returns The same object as @testing-library/react's render()
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderWithProvidersOptions = {}
) {
  const { route = '/' } = options
  const queryClient = createTestQueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
