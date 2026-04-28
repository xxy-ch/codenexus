import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/services/api', () => ({
  default: mockApi,
}))

import { judgeConfigService } from '@/services/judgeConfig'

describe('judgeConfigService language settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads language availability from backend', async () => {
    mockApi.get.mockResolvedValueOnce({
      data: [
        { id: 'python', name: 'Python 3', extension: 'py', enabled: true, is_default: true },
        { id: 'cpp', name: 'C++', extension: 'cpp', enabled: false, is_default: false },
      ],
    })

    const data = await judgeConfigService.getLanguageSettings()

    expect(mockApi.get).toHaveBeenCalledWith('/problems/languages')
    expect(data[0].id).toBe('python')
    expect(data[1].enabled).toBe(false)
  })

  it('updates language availability through backend', async () => {
    mockApi.put.mockResolvedValueOnce({
      data: [
        { id: 'python', name: 'Python 3', extension: 'py', enabled: true, is_default: true },
        { id: 'cpp', name: 'C++', extension: 'cpp', enabled: true, is_default: false },
      ],
    })

    await judgeConfigService.updateLanguageSettings({ c_enabled: true, cpp_enabled: true })

    expect(mockApi.put).toHaveBeenCalledWith('/problems/languages', {
      c_enabled: true,
      cpp_enabled: true,
    })
  })
})
