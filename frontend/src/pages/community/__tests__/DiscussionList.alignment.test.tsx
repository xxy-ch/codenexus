import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscussionList } from '../DiscussionList'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getDiscussions: vi.fn(),
  },
}))

vi.mock('@/services/discussions', () => ({
  discussionsService: {
    getDiscussions: mocks.getDiscussions,
  },
}))

describe('DiscussionList alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDiscussions.mockResolvedValue({
      discussions: [
        {
          id: '1',
          title: '线段树区间最值怎么优化？',
          content: '想把查询复杂度稳定住，当前实现还有冗余分支。',
          author_id: 'u1',
          author_username: 'BinaryArchitect',
          category: 'solution',
          tags: ['线段树', '区间查询'],
          likes_count: 18,
          replies_count: 24,
          views_count: 240,
          is_pinned: false,
          is_locked: false,
          created_at: '2026-03-24T10:00:00Z',
          updated_at: '2026-03-24T10:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  function renderComponent() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DiscussionList />
        </MemoryRouter>
      </QueryClientProvider>,
    )
  }

  it('renders community sidebar, knowledge exchange heading, and dense thread rows', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('社区')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '知识交流' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /发布新帖/ })).toBeInTheDocument()
      expect(screen.getByText('线段树区间最值怎么优化？')).toBeInTheDocument()
      expect(screen.getByText('回复')).toBeInTheDocument()
      expect(screen.getByText('浏览')).toBeInTheDocument()
    })
  })
})
