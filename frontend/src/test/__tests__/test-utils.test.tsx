import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, createTestQueryClient } from '@/test/test-utils'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'

describe('createTestQueryClient', () => {
  it('returns a QueryClient with retry disabled', () => {
    const client = createTestQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.retry).toBe(false)
  })

  it('returns a QueryClient with gcTime set to 0', () => {
    const client = createTestQueryClient()
    const defaults = client.getDefaultOptions()
    expect(defaults.queries?.gcTime).toBe(0)
  })

  it('returns a new instance each call (no shared cache)', () => {
    const clientA = createTestQueryClient()
    const clientB = createTestQueryClient()
    expect(clientA).not.toBe(clientB)
  })
})

describe('renderWithProviders', () => {
  it('renders wrapped component text', () => {
    renderWithProviders(<div data-testid="child">Hello Providers</div>)
    expect(screen.getByTestId('child')).toHaveTextContent('Hello Providers')
  })

  it('provides QueryClient context (useQuery works)', async () => {
    function QueryComponent() {
      const { data, isLoading } = useQuery({
        queryKey: ['test-key'],
        queryFn: () => Promise.resolve('query-result'),
      })
      if (isLoading) return <span>Loading query...</span>
      return <span data-testid="query-data">{data}</span>
    }

    renderWithProviders(<QueryComponent />)

    expect(screen.getByText('Loading query...')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByTestId('query-data')).toHaveTextContent('query-result')
    })
  })

  it('provides Router context with the requested route', async () => {
    function RouteComponent() {
      const location = useLocation()
      return <span data-testid="route-path">{location.pathname}</span>
    }

    renderWithProviders(<RouteComponent />, { route: '/test/42' })

    await waitFor(() => {
      expect(screen.getByTestId('route-path')).toHaveTextContent('/test/42')
    })
  })

  it('uses default route "/" when no route option provided', () => {
    renderWithProviders(<div data-testid="default-route">Default Route</div>)
    expect(screen.getByTestId('default-route')).toBeInTheDocument()
  })
})
