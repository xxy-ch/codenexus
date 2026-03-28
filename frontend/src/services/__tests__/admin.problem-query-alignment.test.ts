import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { adminService } from '@/services/admin'

describe('adminService problem query alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to querying all problems instead of only public ones', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        problems: [
          {
            id: 8,
            title: 'Trees',
            description: 'Tree DP',
            difficulty: 'hard',
            visibility: 'public',
            tags: ['dp'],
            submissions_count: 4,
            accepted_count: 3,
            created_by: 'teacher-1',
            created_at: '2026-03-01T00:00:00Z',
            time_limit: 1000,
            memory_limit: 262144,
          },
        ],
        total: 1,
        page: 3,
        limit: 10,
      },
    })

    const data = await adminService.getProblems({
      page: 3,
      limit: 10,
    })

    const requestedUrl = mockApi.get.mock.calls[0]?.[0] as string
    const parsed = new URL(requestedUrl, 'http://localhost')
    expect(parsed.pathname).toBe('/problems')
    expect(parsed.searchParams.get('is_public')).toBe('false')
    expect(parsed.searchParams.get('page')).toBe('3')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(data.problems[0].status).toBe('published')
  })

  it('preserves archived backend status and ignores unsupported sort hints', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        problems: [
          {
            id: 9,
            title: 'Legacy',
            description: 'Legacy archive',
            difficulty: 'medium',
            status: 'archived',
            visibility: 'private',
            tags: [],
            submissions_count: 0,
            accepted_count: 0,
            created_by: 'teacher-1',
            created_at: '2026-03-01T00:00:00Z',
            time_limit: 1000,
            memory_limit: 262144,
          },
        ],
        total: 0,
        page: 1,
        limit: 20,
      },
    })

    const data = await adminService.getProblems({
      search: 'dp',
      status: 'published',
      sort: 'acceptance',
      page: 1,
      limit: 20,
    })

    const requestedUrl = mockApi.get.mock.calls[0]?.[0] as string
    const parsed = new URL(requestedUrl, 'http://localhost')
    expect(parsed.pathname).toBe('/problems')
    expect(parsed.searchParams.get('is_public')).toBe('false')
    expect(parsed.searchParams.get('search')).toBe('dp')
    expect(parsed.searchParams.get('visibility')).toBe('public')
    expect(parsed.searchParams.get('page')).toBe('1')
    expect(parsed.searchParams.get('limit')).toBe('20')
    expect(parsed.searchParams.has('sort')).toBe(false)
    expect(data.problems[0].status).toBe('archived')
  })
})
