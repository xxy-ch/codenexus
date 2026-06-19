import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Textarea } from '../Textarea'

describe('Textarea', () => {
  it('renders with default variant', () => {
    render(<Textarea placeholder="Write here" />)
    const textarea = screen.getByPlaceholderText('Write here')
    expect(textarea).toHaveClass('bg-background')
    expect(textarea).toHaveClass('rounded-none')
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('renders glass variant', () => {
    render(<Textarea variant="glass" placeholder="Glass" />)
    const textarea = screen.getByPlaceholderText('Glass')
    expect(textarea).toHaveClass('bg-card')
    expect(textarea).toHaveClass('border-border')
  })

  it('accepts text input', async () => {
    const user = userEvent.setup()
    render(<Textarea placeholder="Type" />)
    const textarea = screen.getByPlaceholderText('Type')
    await user.type(textarea, 'Hello world')
    expect(textarea).toHaveValue('Hello world')
  })

  it('shows error state', () => {
    render(<Textarea error="Too short" />)
    expect(screen.getByText('Too short')).toBeInTheDocument()
    expect(screen.getByText('Too short')).toHaveClass('text-destructive')
  })

  it('renders disabled state', () => {
    render(<Textarea disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Textarea className="my-textarea" placeholder="Custom" />)
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('my-textarea')
  })

  it('has min-height', () => {
    render(<Textarea placeholder="Min height" />)
    expect(screen.getByPlaceholderText('Min height')).toHaveClass('min-h-[80px]')
  })
})
