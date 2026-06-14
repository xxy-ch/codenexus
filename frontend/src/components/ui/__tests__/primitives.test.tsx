import { render, screen } from '@testing-library/react'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Loading } from '@/shared/components/Loading'

describe('ui primitives', () => {
  it('renders default button with project styling classes', () => {
    render(<Button>Sign In</Button>)

    const button = screen.getByRole('button', { name: 'Sign In' })
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-primary-foreground')
    expect(button).toHaveClass('rounded-[8px]')
  })

  it('renders input with project surface and border classes', () => {
    render(<Input aria-label="Username" placeholder="1001" />)

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input).toHaveClass('bg-background/60')
    expect(input).toHaveClass('border-border/40')
    expect(input).toHaveClass('rounded-[8px]')
  })

  it('renders loading spinner without material ui progressbar', () => {
    render(<Loading message="Loading..." />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toHaveClass('border-t-primary')
  })
})
