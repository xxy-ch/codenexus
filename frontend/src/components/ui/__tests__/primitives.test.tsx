import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Loading } from '@/components/ui/Loading'

describe('ui primitives', () => {
  it('renders primary button with project styling classes', () => {
    render(<Button variant="primary">Sign In</Button>)

    const button = screen.getByRole('button', { name: 'Sign In' })
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-white')
    expect(button).toHaveClass('rounded-lg')
  })

  it('renders input with project surface and border classes', () => {
    render(<Input aria-label="Username" placeholder="1001" />)

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input).toHaveClass('bg-surface-light')
    expect(input).toHaveClass('border-border-light')
    expect(input).toHaveClass('rounded-lg')
  })

  it('renders loading spinner without material ui progressbar', () => {
    render(<Loading message="Loading..." />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toHaveClass('border-t-primary')
  })
})
