import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlogList } from '../BlogList'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    getArticles: vi.fn(),
    getFeaturedArticles: vi.fn(),
    getCategories: vi.fn(),
    getPopularTags: vi.fn(),
    getTrendingArticles: vi.fn(),
  },
}))

vi.mock('@/services/communityApi', () => ({
  blogApi: {
    getArticles: mocks.getArticles,
    getFeaturedArticles: mocks.getFeaturedArticles,
    getCategories: mocks.getCategories,
    getPopularTags: mocks.getPopularTags,
    getTrendingArticles: mocks.getTrendingArticles,
  },
}))

describe('BlogList alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getArticles.mockResolvedValue({
      articles: [
        {
          id: 1,
          title: 'Dinic 深入拆解',
          slug: 'dinic-deep-dive',
          content: 'content',
          excerpt: '分层网络与当前弧优化的实战笔记。',
          author_id: 'u1',
          author_username: 'Dr. Aris',
          tags: ['网络流', '图论'],
          category: '题解',
          is_published: true,
          is_featured: false,
          view_count: 120,
          like_count: 40,
          comment_count: 12,
          created_at: '2026-03-24T12:00:00Z',
          updated_at: '2026-03-24T12:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      has_more: false,
    })
    mocks.getFeaturedArticles.mockResolvedValue([
      {
        id: 2,
        title: '网络流优化总览',
        slug: 'flow-overview',
        content: 'content',
        excerpt: '从建图到增广的完整分析。',
        author_id: 'u2',
        author_username: 'Editor',
        tags: ['专题'],
        category: '精选',
        is_published: true,
        is_featured: true,
        view_count: 560,
        like_count: 90,
        comment_count: 16,
        created_at: '2026-03-24T12:00:00Z',
        updated_at: '2026-03-24T12:00:00Z',
      },
    ])
    mocks.getCategories.mockResolvedValue(['题解', '公告'])
    mocks.getPopularTags.mockResolvedValue([{ tag: '网络流', count: 6 }])
    mocks.getTrendingArticles.mockResolvedValue([])
  })

  it('renders featured editorial hero, publication grid, and localized filters', async () => {
    render(
      <MemoryRouter>
        <BlogList />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('精选专栏').length).toBeGreaterThan(0)
      expect(screen.getByRole('heading', { name: '网络流优化总览' })).toBeInTheDocument()
      expect(screen.getByText('最近刊物')).toBeInTheDocument()
      expect(screen.getByText('写文章')).toBeInTheDocument()
      expect(screen.getByText('Dinic 深入拆解')).toBeInTheDocument()
    })
  })
})
