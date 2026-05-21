import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { searchApi } from '@/services/searchApi'

describe('searchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes search filters through query string', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        query: 'two sum',
        results: [],
        total_count: 0,
        discussion_count: 0,
        article_count: 0,
        page: 2,
        limit: 10,
        has_more: false,
      },
    })

    const data = await searchApi.search({
      q: 'two sum',
      type: 'discussion',
      tag: 'arrays',
      page: 2,
      limit: 10,
    })

    expect(mockApi.get).toHaveBeenCalledWith('/search?q=two+sum&type=discussion&tag=arrays&page=2&limit=10')
    expect(data.page).toBe(2)
  })

  it('requests suggestions from the backend endpoint', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        query: 'dyn',
        suggestions: [{ text: 'dynamic-programming', type: 'tag', count: 0 }],
      },
    })

    const data = await searchApi.getSuggestions('dyn')

    expect(mockApi.get).toHaveBeenCalledWith('/search/suggestions?q=dyn')
    expect(data.suggestions[0].text).toBe('dynamic-programming')
  })
})
