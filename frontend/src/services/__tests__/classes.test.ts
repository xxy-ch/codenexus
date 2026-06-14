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

import { classesService } from '@/services/classes'

describe('classesService mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps code to enrollment_code and merges stats', async () => {
    mockApi.get
      .mockResolvedValueOnce({
        data: {
          classes: [
            {
              id: 1,
              name: 'Class A',
              description: 'desc',
              semester: '2026 Spring',
              teacher_id: 't1',
              code: 'ABC123',
              created_at: '2026-03-06T00:00:00Z',
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        },
      })
      .mockResolvedValueOnce({ data: { total_students: 42 } })

    const res = await classesService.getClasses(1, 20)

    expect(mockApi.get).toHaveBeenNthCalledWith(1, '/classes?page=1&limit=20')
    expect(mockApi.get).toHaveBeenNthCalledWith(2, '/classes/1/stats')
    expect(res.classes[0]).toMatchObject({
      id: 1,
      semester: '2026 Spring',
      enrollment_code: 'ABC123',
      student_count: 42,
    })
  })

  it('exposes live write-path helpers for publish and submissions', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 9, published_at: '2026-03-17T00:00:00Z' } })
    mockApi.get.mockResolvedValueOnce({ data: [{ id: 5, submission_id: 8, score: 100 }] })

    const publishResult = await classesService.publishAssignment(9)
    const submissions = await classesService.getAssignmentSubmissions(9)

    expect(mockApi.post).toHaveBeenCalledWith('/classes/assignments/9/publish')
    expect(mockApi.get).toHaveBeenCalledWith('/classes/assignments/9/submissions')
    expect(publishResult.id).toBe(9)
    expect(submissions[0].submission_id).toBe(8)
  })
})
