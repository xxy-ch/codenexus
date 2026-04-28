import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Setup any global test utilities here
beforeEach(() => {
  vi.clearAllMocks()
})