import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/services/config'
import { persistRefreshedAuthTokens } from '@/services/api'

describe('api refresh response handling', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps the existing refresh token when the backend only returns a new access token', () => {
    persistRefreshedAuthTokens(
      { token: 'new-access-token' },
      'old-refresh-token',
    )

    expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('new-access-token')
    expect(localStorage.getItem('token')).toBe('new-access-token')
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('old-refresh-token')
    expect(localStorage.getItem('refresh_token')).toBe('old-refresh-token')
  })
})
