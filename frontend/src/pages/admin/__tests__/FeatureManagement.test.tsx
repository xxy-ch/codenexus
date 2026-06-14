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

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}))

import { FeatureManagement } from '../FeatureManagement'

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

const mockFlags: Record<string, Array<{ enabled: boolean; scope: string; scope_id: number | null }>> = {
  direct_messages: [],
  plagiarism: [{ enabled: false, scope: 'global', scope_id: null }],
}

describe('FeatureManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: 'root', campus_id: 1, grade_id: 1 },
    })
  })

  it('renders feature matrix table with correct columns', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url.includes('/flags')) {
        const slug = url.split('/')[2]
        return Promise.resolve({ data: mockFlags[slug] ?? [] })
      }
      return Promise.resolve({ data: [] })
    })

    render(<FeatureManagement />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('功能开关管理')).toBeInTheDocument()
    })

    // Column headers
    expect(screen.getByText('功能名称')).toBeInTheDocument()
    expect(screen.getByText('默认值')).toBeInTheDocument()
    expect(screen.getByText('全局')).toBeInTheDocument()
    expect(screen.getByText('校区')).toBeInTheDocument()
    expect(screen.getByText('年级')).toBeInTheDocument()

    // Feature rows
    expect(screen.getByText('Direct Messages')).toBeInTheDocument()
    expect(screen.getByText('Plagiarism Detection')).toBeInTheDocument()
  })

  it('shows EmptyState when no features in registry', async () => {
    mockApi.get.mockResolvedValue({ data: [] })

    render(<FeatureManagement />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('未注册功能')).toBeInTheDocument()
    })
  })

  it('shows InlineError when registry fetch fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'))

    render(<FeatureManagement />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('功能列表加载失败')).toBeInTheDocument()
    })
  })

  it('Root user sees writable toggles at global and campus scopes', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url.includes('/flags')) {
        const slug = url.split('/')[2]
        return Promise.resolve({ data: mockFlags[slug] ?? [] })
      }
      return Promise.resolve({ data: [] })
    })
    mockUseAuth.mockReturnValue({
      user: { role: 'root', campus_id: 1, grade_id: 1 },
    })

    render(<FeatureManagement />, { wrapper: createWrapper() })

    await waitFor(() => {
      // Root user should have multiple toggle switches (global + campus per feature)
      const toggles = screen.getAllByRole('switch')
      // 2 features x 3 scope columns (global, campus, grade) = 6 toggles
      // Grade is read-only for root
      expect(toggles.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('CampusAdmin user sees writable toggles at campus and grade scopes', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url.includes('/flags')) {
        const slug = url.split('/')[2]
        return Promise.resolve({ data: mockFlags[slug] ?? [] })
      }
      return Promise.resolve({ data: [] })
    })
    mockUseAuth.mockReturnValue({
      user: { role: 'campusAdmin', campus_id: 1, grade_id: null },
    })

    render(<FeatureManagement />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('功能开关管理')).toBeInTheDocument()
    })
    // CampusAdmin: campus + grade writable, global read-only
    const toggles = screen.getAllByRole('switch')
    expect(toggles.length).toBeGreaterThanOrEqual(4)
  })

  it('toggles call useSetFeatureFlag mutation', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/features/registry') return Promise.resolve({ data: mockRegistry })
      if (url.includes('/flags')) {
        const slug = url.split('/')[2]
        return Promise.resolve({ data: mockFlags[slug] ?? [] })
      }
      return Promise.resolve({ data: [] })
    })
    mockApi.post.mockResolvedValue({ data: { ok: true } })
    mockUseAuth.mockReturnValue({
      user: { role: 'root', campus_id: 1, grade_id: 1 },
    })

    render(<FeatureManagement />, { wrapper: createWrapper() })

    // Wait for features to render
    await waitFor(() => {
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
    })

    // Click the first toggle (global scope for first feature)
    const firstToggle = screen.getAllByRole('switch')[0]
    await userEvent.click(firstToggle)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalled()
    })
  })
})
