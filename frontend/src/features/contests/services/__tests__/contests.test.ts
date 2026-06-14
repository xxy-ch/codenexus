import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { contestsService } from '@/features/contests/services/contests'

describe('contestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps backend contest resources into frontend contest cards', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          contests: [
            {
              id: 1,
              organization_id: 1,
              campus_id: 1,
              name: 'Spring Warmup',
              description: 'Demo contest',
              rules: 'acm',
              start_time: '2026-03-07T08:00:00Z',
              end_time: '2026-03-07T10:00:00Z',
              created_at: '2026-03-01T00:00:00Z',
              updated_at: '2026-03-01T00:00:00Z',
            },
          ],
          total: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          id: 1,
          organization_id: 1,
          campus_id: 1,
          name: 'Spring Warmup',
          description: 'Demo contest',
          rules: 'acm',
          start_time: '2026-03-07T08:00:00Z',
          end_time: '2026-03-07T10:00:00Z',
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
          problem_count: 1,
          participant_count: 2,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            problem_id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            points: 100,
            order_index: 1,
          },
        ],
      })

    const data = await contestsService.getContests({ page: 1, limit: 20 })

    expect(mockApi.get).toHaveBeenCalledWith('/contests?page=1&limit=20')
    expect(data.total).toBe(1)
    expect(data.contests[0].participants_count).toBe(2)
    expect(data.contests[0].problems_count).toBe(1)
    expect(data.contests[0].difficulty).toBe('easy')
  })

  it('hydrates contest detail from multiple backend endpoints', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          id: 1,
          organization_id: 1,
          campus_id: 1,
          name: 'Spring Warmup',
          description: 'Demo contest',
          rules: 'acm',
          start_time: '2026-03-07T08:00:00Z',
          end_time: '2026-03-07T10:00:00Z',
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
          problem_count: 1,
          participant_count: 2,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            problem_id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            points: 100,
            order_index: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          id: '22222222-2222-2222-2222-222222222222',
          role: 'teacher',
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            contest_id: 1,
            user_id: '22222222-2222-2222-2222-222222222222',
            registered_at: '2026-03-07T08:01:00Z',
          },
        ],
      })

    const data = await contestsService.getContestDetail('1')

    expect(mockApi.get).toHaveBeenCalledWith('/contests/1')
    expect(mockApi.get).toHaveBeenCalledWith('/contests/1/problems')
    expect(mockApi.get).toHaveBeenCalledWith('/contests/1/participants')
    expect(data.is_registered).toBe(true)
    expect(data.problems[0].id).toBe('1')
  })

  it('skips participant roster lookup for students', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          id: 1,
          organization_id: 1,
          campus_id: 1,
          name: 'Spring Warmup',
          description: 'Demo contest',
          rules: 'acm',
          start_time: '2026-03-07T08:00:00Z',
          end_time: '2026-03-07T10:00:00Z',
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
          problem_count: 1,
          participant_count: 2,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 10,
            problem_id: 1,
            title: 'Two Sum',
            difficulty: 'easy',
            points: 100,
            order_index: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        data: {
          id: '22222222-2222-2222-2222-222222222222',
          role: 'student',
        },
      })

    const data = await contestsService.getContestDetail('1')

    expect(mockApi.get).toHaveBeenCalledWith('/contests/1')
    expect(mockApi.get).toHaveBeenCalledWith('/contests/1/problems')
    expect(mockApi.get).toHaveBeenCalledWith('/users/me')
    expect(mockApi.get).not.toHaveBeenCalledWith('/contests/1/participants')
    expect(data.is_registered).toBe(false)
  })
})
