import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { rankingService } from '@/features/ranking/services/ranking'

describe('rankingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps global leaderboard payload into ranking response', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        entries: [
          {
            user_id: '22222222-2222-2222-2222-222222222222',
            username: '2001',
            rank: 1,
            score: 3,
            problems_solved: 1,
            submissions: 1,
            acceptance_rate: 100,
            organization_id: 1,
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      },
    })

    const data = await rankingService.getGlobalRanking({ page: 1, limit: 20 })

    expect(mockApi.get).toHaveBeenCalledWith('/leaderboard/global?limit=20&offset=0')
    expect(data.users[0].username).toBe('2001')
    expect(data.users[0].school_name).toBe('组织 1')
  })

  it('uses school leaderboard endpoint for organization ranking', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        entries: [],
        total: 0,
        limit: 20,
        offset: 0,
      },
    })

    await rankingService.getOrganizationRanking({ school_id: '7', page: 1, limit: 20 })

    expect(mockApi.get).toHaveBeenCalledWith('/leaderboard/school/7?limit=20&offset=0')
  })
})
