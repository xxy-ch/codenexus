import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DiscussionDetail } from '../DiscussionDetail'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getDiscussion: vi.fn(),
  },
}))

vi.mock('@/services/communityApi', () => ({
  discussionsApi: {
    getDiscussion: mocks.getDiscussion,
    createReply: vi.fn(),
    likeDiscussion: vi.fn(),
    likeReply: vi.fn(),
  },
}))

vi.mock('@/hooks/useCommunityUpdates', () => ({
  useDiscussionUpdates: () => ({ update: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'viewer-1' } }),
}))

describe('DiscussionDetail alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDiscussion.mockResolvedValue({
      discussion: {
        id: 1,
        title: '线段树区间最值怎么优化？',
        content: '想把查询复杂度稳定住，当前实现还有冗余分支。',
        author_id: 'u1',
        author_username: 'BinaryArchitect',
        tags: ['线段树', '区间查询'],
        is_pinned: true,
        is_solved: true,
        is_locked: false,
        view_count: 240,
        reply_count: 24,
        like_count: 18,
        created_at: '2026-03-24T10:00:00Z',
        updated_at: '2026-03-24T10:00:00Z',
      },
      replies: [],
      author: {
        id: 'u1',
        username: 'BinaryArchitect',
      },
      problem: {
        id: 101,
        title: '区间最值维护',
        difficulty: 'medium',
      },
    })
  })

  it('renders the discussion as a Chinese analysis workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/discussions/1']}>
        <Routes>
          <Route path="/discussions/:id" element={<DiscussionDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '线段树区间最值怎么优化？' })).toBeInTheDocument()
      expect(screen.getAllByText('讨论诊断台').length).toBeGreaterThan(0)
      expect(screen.getByText('讨论概览')).toBeInTheDocument()
      expect(screen.getByText('讨论正文')).toBeInTheDocument()
      expect(screen.getByText(/^回复池/)).toBeInTheDocument()
      expect(screen.getByText('讨论侧栏')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '写回复' })).toBeInTheDocument()
    })
  })
})
