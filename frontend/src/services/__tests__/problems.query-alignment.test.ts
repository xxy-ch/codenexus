import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { problemsService } from '@/services/problems'

describe('problemsService query alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('encodes repeated tags and ignores unsupported sort hints when listing problems', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        problems: [],
        total: 0,
        page: 2,
        limit: 30,
      },
    })

    await problemsService.getProblems({
      tags: ['graphs', 'dp'],
      sort: 'hard_first',
      page: 2,
      limit: 30,
    })

    const requestedUrl = mockApi.get.mock.calls[0]?.[0] as string
    const parsed = new URL(requestedUrl, 'http://localhost')
    expect(parsed.pathname).toBe('/problems')
    expect(parsed.searchParams.getAll('tags')).toEqual(['graphs', 'dp'])
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('limit')).toBe('30')
    expect(parsed.searchParams.has('sort')).toBe(false)
  })
})
