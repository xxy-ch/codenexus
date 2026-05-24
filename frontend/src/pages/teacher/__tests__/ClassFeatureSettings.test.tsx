import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'teacher', campus_id: 1, grade_id: 1 },
  }),
}))

import { ClassFeatureSettings } from '../ClassFeatureSettings'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }
}

const mockRegistry = [
  {
    id: '1',
    slug: 'direct_messages',
    name: 'Direct Messages',
    description: 'Direct messaging between users',
    default_enabled: true,
    category: 'communication',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    slug: 'plagiarism',
    name: 'Plagiarism Detection',
    description: 'Code similarity detection',
    default_enabled: true,
    category: 'academic',
    created_at: '2026-01-01T00:00:00Z',
  },
]

const mockResolved = {
  direct_messages: { slug: 'direct_messages', enabled: true, source: 'default' },
  plagiarism: { slug: 'plagiarism', enabled: true, source: 'default' },
}

const mockClasses = {
  classes: [
    { id: 1, name: 'Class A', student_count: 30 },
    { id: 2, name: 'Class B', student_count: 25 },
  ],
}

describe('ClassFeatureSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders feature cards with toggle and inherited indicator', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url === '/features/resolved') return Promise.resolve({ data: mockResolved })
      if (url.includes('/classes')) return Promise.resolve({ data: mockClasses })
      // Per-feature class flags - no class override
      if (url.includes('/flags')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })

    render(<ClassFeatureSettings />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('班级功能开关')).toBeInTheDocument()
    })

    // Feature names should appear
    expect(screen.getByText('Direct Messages')).toBeInTheDocument()
    expect(screen.getByText('Plagiarism Detection')).toBeInTheDocument()
  })

  it('shows InheritedIndicator when no class override exists', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url === '/features/resolved') return Promise.resolve({ data: mockResolved })
      if (url.includes('/classes')) return Promise.resolve({ data: mockClasses })
      if (url.includes('/flags')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })

    render(<ClassFeatureSettings />, { wrapper: createWrapper() })

    await waitFor(() => {
      // source='default' for all, scope='class' -- source !== scope so indicator shown
      const indicators = screen.getAllByText(/继承自:/)
      expect(indicators.length).toBeGreaterThan(0)
    })
  })

  it('toggle calls mutation with scope=class and scope_id', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url === '/features/resolved') return Promise.resolve({ data: mockResolved })
      if (url.includes('/classes')) return Promise.resolve({ data: mockClasses })
      if (url.includes('/flags')) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: [] })
    })
    mockApi.post.mockResolvedValue({ data: { ok: true } })

    render(<ClassFeatureSettings />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
    })

    const firstToggle = screen.getAllByRole('switch')[0]
    await userEvent.click(firstToggle)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/flags'),
        expect.objectContaining({
          scope: 'class',
          scope_id: expect.any(Number),
        }),
      )
    })
  })

  it('shows EmptyState when no features registered', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: [] })
      if (url.includes('/classes')) return Promise.resolve({ data: mockClasses })
      return Promise.resolve({ data: [] })
    })

    render(<ClassFeatureSettings />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('未注册功能')).toBeInTheDocument()
    })
  })

  it('shows InlineError when fetch fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'))

    render(<ClassFeatureSettings />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('功能列表加载失败')).toBeInTheDocument()
    })
  })
})
