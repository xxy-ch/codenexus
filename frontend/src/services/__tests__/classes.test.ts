import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
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
      enrollment_code: 'ABC123',
      student_count: 42,
    })
  })
})
