import { describe, expect, it } from 'vitest'
import { cn } from '@/shared/lib/utils'

describe('cn utility', () => {
  it('merges multiple class names into a single string', () => {
    const result = cn('px-2', 'py-1', 'text-sm')
    expect(result).toBe('px-2 py-1 text-sm')
  })

  it('handles conditional classes with falsy values', () => {
    const isActive = true
    const isDisabled = false

    const result = cn('base', isActive && 'active', isDisabled && 'disabled')

    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).not.toContain('disabled')
  })

  it('deduplicates conflicting tailwind classes', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })

  it('deduplicates conflicting margin classes', () => {
    const result = cn('m-2', 'm-6')
    expect(result).toBe('m-6')
  })

  it('deduplicates conflicting text color classes', () => {
    const result = cn('text-red-500', 'text-blue-700')
    expect(result).toBe('text-blue-700')
  })

  it('returns empty string when given no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles mixed valid and undefined inputs', () => {
    const result = cn('base', undefined, null, 'extra')
    expect(result).toBe('base extra')
  })

  it('merges non-conflicting tailwind classes without deduplication', () => {
    const result = cn('px-4', 'py-2', 'font-bold', 'rounded-lg')
    expect(result).toBe('px-4 py-2 font-bold rounded-lg')
  })

  it('handles object-style conditional classes', () => {
    const result = cn({ active: true, disabled: false, primary: true })
    expect(result).toContain('active')
    expect(result).toContain('primary')
    expect(result).not.toContain('disabled')
  })

  it('handles array input', () => {
    const result = cn(['px-2', 'py-1'])
    expect(result).toBe('px-2 py-1')
  })
})
