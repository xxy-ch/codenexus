import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { BlogDetail } from '../BlogDetail'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getArticle: vi.fn(),
    createComment: vi.fn(),
    likeArticle: vi.fn(),
  },
}))

vi.mock('@/services/communityApi', () => ({
  blogApi: {
    getArticle: mocks.getArticle,
    createComment: mocks.createComment,
    likeArticle: mocks.likeArticle,
  },
}))

vi.mock('@/hooks/useCommunityUpdates', () => ({
  useArticleUpdates: () => ({ update: null }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'viewer-1', username: 'reader' } }),
}))

describe('BlogDetail alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getArticle.mockResolvedValue({
      article: {
        id: 1,
        title: 'Dinic 深入拆解',
        slug: 'dinic-deep-dive',
        content: '正文内容',
        excerpt: '分层网络与当前弧优化的实战笔记。',
        author_id: 'u1',
        author_username: 'Dr. Aris',
        tags: ['网络流', '图论'],
        category: '题解',
        is_published: true,
        is_featured: true,
        view_count: 120,
        like_count: 40,
        comment_count: 0,
        created_at: '2026-03-24T12:00:00Z',
        updated_at: '2026-03-24T12:00:00Z',
      },
      comments: [],
      author: {
        id: 'u1',
        username: 'Dr. Aris',
      },
    })
  })

  it('renders the article detail as a Chinese editorial workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/blog/dinic-deep-dive']}>
        <Routes>
          <Route path="/blog/:slug" element={<BlogDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dinic 深入拆解' })).toBeInTheDocument()
      expect(screen.getByText('文章正文')).toBeInTheDocument()
      expect(screen.getByText(/^评论池/)).toBeInTheDocument()
      expect(screen.getByText('文章侧栏')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '返回博客' })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: '写评论' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: '写评论' })[0])

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '写评论' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('写下你对这篇文章的补充、修正或追问。')).toBeInTheDocument()
    })
  })
})
