import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with default variant classes', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-primary-foreground')
    expect(button).toHaveClass('rounded-[8px]')
  })

  it('renders outline variant', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button', { name: 'Outline' })
    expect(button).toHaveClass('border-border/60')
    expect(button).toHaveClass('backdrop-blur-sm')
  })

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button', { name: 'Secondary' })
    expect(button).toHaveClass('bg-secondary/80')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button', { name: 'Ghost' })
    expect(button).toHaveClass('hover:bg-accent/80')
  })

  it('renders destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('bg-destructive/10')
    expect(button).toHaveClass('text-destructive')
  })

  it('renders link variant', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button', { name: 'Link' })
    expect(button).toHaveClass('text-primary')
    expect(button).toHaveClass('hover:underline')
  })

  it('renders glass variant', () => {
    render(<Button variant="glass">Glass</Button>)
    const button = screen.getByRole('button', { name: 'Glass' })
    expect(button).toHaveClass('backdrop-blur-xl')
    expect(button).toHaveClass('bg-background/65')
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="xs">XS</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-[8px]')

    rerender(<Button size="sm">SM</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-[12px]')

    rerender(<Button size="lg">LG</Button>)
    expect(screen.getByRole('button')).toHaveClass('px-[20px]')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button')).toHaveClass('size-[36px]')
  })

  it('calls onClick handler', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>Disabled</Button>)

    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="my-custom">Custom</Button>)
    expect(screen.getByRole('button')).toHaveClass('my-custom')
  })

  it('has data-slot attribute', () => {
    render(<Button>Slot</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button')
  })
})
