import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SearchResults } from './SearchResults'

const { mocks } = vi.hoisted(() => ({
  mocks: {
    search: vi.fn(),
  },
}))

vi.mock('@/services/searchApi', () => ({
  searchApi: {
    search: mocks.search,
  },
}))

describe('SearchResults alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.search.mockResolvedValue({
      query: '线段树',
      results: [
        {
          type: 'Discussion',
          id: 1,
          title: '线段树区间最值怎么优化？',
          content: '想把查询复杂度稳定住，当前实现还有冗余分支。',
          author_id: 'u1',
          author_username: 'BinaryArchitect',
          tags: ['线段树', '区间查询'],
          is_solved: true,
          is_pinned: true,
          reply_count: 24,
          like_count: 18,
          view_count: 240,
          created_at: '2026-03-24T10:00:00Z',
          relevance_score: 0.98,
          highlighted_title: '<mark>线段树</mark>区间最值怎么优化？',
          highlighted_content: '当前实现还有冗余分支。',
        },
      ],
      total_count: 1,
      problem_count: 0,
      discussion_count: 1,
      article_count: 0,
      page: 1,
      limit: 20,
      has_more: false,
    })
  })

  it('renders search as a dense search workspace with result pool language', async () => {
    render(
      <MemoryRouter initialEntries={['/search?q=%E7%BA%BF%E6%AE%B5%E6%A0%91']}>
        <Routes>
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '搜索内容库' })).toBeInTheDocument()
      expect(screen.getAllByText('搜索工作台').length).toBeGreaterThan(0)
      expect(screen.getByText('结果概览')).toBeInTheDocument()
      expect(screen.getAllByText(/^结果池/).length).toBeGreaterThan(0)
      expect(screen.getByText('讨论结果')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('按标题、标签或正文搜索')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '全部结果' })).toHaveClass('h-12')
      expect(screen.getByRole('combobox', { name: '排序' })).toHaveClass('h-12')
      expect(screen.getByRole('combobox', { name: '排序' })).toHaveClass('rounded-[16px]')
    })
  })
})
