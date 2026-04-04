import { beforeEach, vi } from 'vitest'

global.fetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as { __resetLocalStorage__?: () => void }).__resetLocalStorage__?.()
})
