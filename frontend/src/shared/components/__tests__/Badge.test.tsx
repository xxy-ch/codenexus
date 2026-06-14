import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders with default variant', () => {
    render(<Badge>Default</Badge>)
    const badge = screen.getByText('Default')
    expect(badge.tagName).toBe('SPAN')
    expect(badge).toHaveClass('rounded-full')
    expect(badge).toHaveClass('bg-primary/10')
  })

  it('renders secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    expect(screen.getByText('Secondary')).toHaveClass('bg-secondary')
  })

  it('renders destructive variant', () => {
    render(<Badge variant="destructive">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('bg-destructive/10')
  })

  it('renders outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText('Outline')).toHaveClass('border-border/60')
  })

  it('renders success variant', () => {
    render(<Badge variant="success">Passed</Badge>)
    expect(screen.getByText('Passed')).toHaveClass('bg-status-accepted/10')
  })

  it('renders warning variant', () => {
    render(<Badge variant="warning">TLE</Badge>)
    expect(screen.getByText('TLE')).toHaveClass('bg-status-tle/10')
  })

  it('renders info variant', () => {
    render(<Badge variant="info">Pending</Badge>)
    expect(screen.getByText('Pending')).toHaveClass('bg-status-pending/10')
  })

  it('renders difficulty variants', () => {
    const { rerender } = render(<Badge variant="easy">Easy</Badge>)
    expect(screen.getByText('Easy')).toHaveClass('bg-difficulty-easy/10')

    rerender(<Badge variant="medium">Medium</Badge>)
    expect(screen.getByText('Medium')).toHaveClass('bg-difficulty-medium/10')

    rerender(<Badge variant="hard">Hard</Badge>)
    expect(screen.getByText('Hard')).toHaveClass('bg-difficulty-hard/10')
  })

  it('applies custom className', () => {
    render(<Badge className="extra">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('extra')
  })
})
