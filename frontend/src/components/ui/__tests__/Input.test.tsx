import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  it('renders with default variant', () => {
    render(<Input placeholder="Enter text" />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toHaveClass('bg-card')
    expect(input).toHaveClass('rounded-lg')
    expect(input).toHaveClass('border-border')
  })

  it('renders glass variant', () => {
    render(<Input variant="glass" placeholder="Glass input" />)
    const input = screen.getByPlaceholderText('Glass input')
    expect(input).toHaveClass('backdrop-blur-sm')
    expect(input).toHaveClass('bg-background/60')
  })

  it('accepts text input', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Type here" />)
    const input = screen.getByPlaceholderText('Type here')
    await user.type(input, 'Hello')
    expect(input).toHaveValue('Hello')
  })

  it('shows error state', () => {
    render(<Input error="Field is required" placeholder="Error input" />)
    expect(screen.getByText('Field is required')).toBeInTheDocument()
    expect(screen.getByText('Field is required')).toHaveClass('text-destructive')
  })

  it('renders disabled state', () => {
    render(<Input disabled placeholder="Disabled" />)
    const input = screen.getByPlaceholderText('Disabled')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-50')
  })

  it('applies custom className', () => {
    render(<Input className="my-input" placeholder="Custom" />)
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('my-input')
  })

  it('supports aria-label', () => {
    render(<Input aria-label="Username" />)
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument()
  })
})
