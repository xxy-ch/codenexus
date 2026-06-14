import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { blogApi } from '@/services/articlesApi'
import { discussionsApi } from '@/services/discussionsApi'

describe('communityApi normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes popular tags from tuple payload', async () => {
    mockApi.get.mockResolvedValueOnce({ data: [['dp', 12], ['graph', 7]] })

    const tags = await blogApi.getPopularTags(10)

    expect(tags).toEqual([
      { tag: 'dp', count: 12 },
      { tag: 'graph', count: 7 },
    ])
  })

  it('normalizes boolean like response', async () => {
    mockApi.post.mockResolvedValueOnce({ data: true })

    const result = await blogApi.likeArticle(1)

    expect(result).toEqual({ liked: true, like_count: -1 })
  })

  it('maps article list pages to has_more', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        articles: [
          {
            id: 1,
            title: 'Hello',
            slug: 'hello',
            content: 'world',
            tags: [],
            is_published: true,
            is_featured: false,
            view_count: 1,
            like_count: 2,
            comment_count: 3,
            author_id: 'u1',
            author_username: 'tester',
            created_at: '2026-03-06T00:00:00Z',
            updated_at: '2026-03-06T00:00:00Z',
          },
        ],
        total: 25,
        page: 2,
        limit: 10,
        pages: 3,
      },
    })

    const data = await blogApi.getArticles({ page: 2, limit: 10 })

    expect(data.page).toBe(2)
    expect(data.has_more).toBe(true)
    expect(data.articles[0].excerpt).toBeTruthy()
  })

  it('maps parent_reply_id to parent_id when creating reply', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        id: 11,
        discussion_id: 2,
        parent_id: 3,
        content: 'reply',
        author_id: 'u2',
        author_username: 'alice',
        like_count: 0,
        created_at: '2026-03-06T00:00:00Z',
        updated_at: '2026-03-06T00:00:00Z',
      },
    })

    const reply = await discussionsApi.createReply(2, {
      content: 'reply',
      parent_reply_id: 3,
    })

    expect(mockApi.post).toHaveBeenCalledWith('/discussions/2/replies', {
      content: 'reply',
      parent_id: 3,
      is_solution: undefined,
    })
    expect(reply.parent_reply_id).toBe(3)
  })
})
