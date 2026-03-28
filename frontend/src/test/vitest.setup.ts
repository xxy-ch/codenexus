import { vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

// Setup any global test utilities here
beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as { __resetLocalStorage__?: () => void }).__resetLocalStorage__?.()
})
