import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useCountdown from '@/hooks/useCountdown'

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns correct initial countdown value', () => {
    const targetTime = new Date(Date.now() + 60_000).toISOString()

    const { result } = renderHook(() => useCountdown(targetTime))

    // Initial timeLeft should be close to 60000ms (60 seconds)
    expect(result.current.timeLeft).toBeGreaterThan(59_000)
    expect(result.current.timeLeft).toBeLessThanOrEqual(60_000)

    // formattedTime should have correct structure
    expect(result.current.formattedTime).toEqual({
      days: 0,
      hours: 0,
      minutes: 1,
      seconds: expect.any(Number),
    })
  })

  it('counts down over time', () => {
    const targetTime = new Date(Date.now() + 10_000).toISOString()

    const { result } = renderHook(() => useCountdown(targetTime))

    const initialTime = result.current.timeLeft
    expect(initialTime).toBeGreaterThan(9_000)

    // Advance by 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // timeLeft should have decreased by roughly 1 second
    expect(result.current.timeLeft).toBeLessThan(initialTime)
    expect(result.current.timeLeft).toBeGreaterThan(8_000)
  })

  it('stops at zero and does not go negative', () => {
    const targetTime = new Date(Date.now() + 2000).toISOString()

    const { result } = renderHook(() => useCountdown(targetTime))

    // Advance well past the target time
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(result.current.timeLeft).toBe(0)
    expect(result.current.formattedTime).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it('returns zero immediately for a past target date', () => {
    const pastTime = new Date(Date.now() - 60_000).toISOString()

    const { result } = renderHook(() => useCountdown(pastTime))

    expect(result.current.timeLeft).toBe(0)
    expect(result.current.formattedTime).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    })
  })

  it('formats days correctly for long durations', () => {
    const targetTime = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 5000).toISOString()

    const { result } = renderHook(() => useCountdown(targetTime))

    expect(result.current.formattedTime.days).toBe(3)
    expect(result.current.formattedTime.hours).toBe(0)
  })

  it('respects custom interval', () => {
    const targetTime = new Date(Date.now() + 10_000).toISOString()

    // Use 500ms interval instead of default 1000ms
    const { result } = renderHook(() => useCountdown(targetTime, 500))

    const initialTime = result.current.timeLeft

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.timeLeft).toBeLessThan(initialTime)
  })
})
