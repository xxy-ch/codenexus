import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeatureToggle } from '../FeatureToggle'

describe('FeatureToggle', () => {
  const defaultProps = {
    slug: 'direct_messages',
    scope: 'global' as const,
    enabled: false,
    onToggle: vi.fn(),
  }

  it('renders label text with capitalized slug', () => {
    render(<FeatureToggle {...defaultProps} />)
    expect(screen.getByText('Direct messages')).toBeInTheDocument()
  })

  it('renders toggle switch with role=switch', () => {
    render(<FeatureToggle {...defaultProps} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('shows aria-checked=true when enabled', () => {
    render(<FeatureToggle {...defaultProps} enabled={true} />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onToggle with (slug, scope, !enabled) when clicked', async () => {
    const onToggle = vi.fn()
    render(<FeatureToggle {...defaultProps} onToggle={onToggle} enabled={false} />)

    await userEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith('direct_messages', 'global', true)
  })

  it('shows disabled styling when disabled=true', () => {
    const { container } = render(<FeatureToggle {...defaultProps} disabled={true} />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('opacity-50')
    expect(wrapper).toHaveClass('pointer-events-none')
  })

  it('shows InheritedIndicator when source differs from current scope', () => {
    render(<FeatureToggle {...defaultProps} scope="class" source="global" />)
    expect(screen.getByText(/全局/)).toBeInTheDocument()
  })

  it('does not show InheritedIndicator when source matches scope', () => {
    render(<FeatureToggle {...defaultProps} scope="global" source="global" />)
    expect(screen.queryByText(/全局/)).not.toBeInTheDocument()
  })

  it('does not show InheritedIndicator when source is not provided', () => {
    render(<FeatureToggle {...defaultProps} />)
    expect(screen.queryByText(/全局/)).not.toBeInTheDocument()
    expect(screen.queryByText(/校区/)).not.toBeInTheDocument()
  })
})
