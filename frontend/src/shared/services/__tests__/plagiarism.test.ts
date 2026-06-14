import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/shared/services/api', () => ({
  default: mockApi,
}))

import { plagiarismService } from '@/features/admin/services/plagiarism'

describe('plagiarismService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches reports with paging query', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        reports: [],
        total: 0,
        page: 2,
        limit: 10,
      },
    })

    const data = await plagiarismService.getReports(2, 10)

    expect(mockApi.get).toHaveBeenCalledWith('/admin/plagiarism/reports?page=2&limit=10')
    expect(data.page).toBe(2)
  })

  it('updates scan config through admin endpoint', async () => {
    const payload = {
      enabled: true,
      language: 'all' as const,
      threshold: 0.85,
      min_token_length: 5,
      window_size: 30,
      ignore_comments: true,
      ignore_whitespace: true,
      max_reports_per_run: 100,
    }

    mockApi.put.mockResolvedValueOnce({ data: payload })

    const data = await plagiarismService.updateScanConfig(payload)

    expect(mockApi.put).toHaveBeenCalledWith('/admin/plagiarism/config', payload)
    expect(data.threshold).toBe(0.85)
  })
})
