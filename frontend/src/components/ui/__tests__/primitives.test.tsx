import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { StatusBadge } from '@/components/ui/StatusBadge'

describe('ui primitives', () => {
  it('renders primary button with flat design system classes and visible focus treatment', () => {
    render(<Button variant="primary">Sign In</Button>)

    const button = screen.getByRole('button', { name: 'Sign In' })
    expect(button.className).toContain('bg-[linear-gradient(135deg,#003d9b,#0052cc)]')
    expect(button).toHaveClass('text-white')
    expect(button).toHaveClass('rounded-[8px]')
    expect(button.className).toContain('focus-visible:ring-2')
  })

  it('renders input with flat surface classes and focus-visible border treatment', () => {
    render(<Input aria-label="Username" placeholder="1001" />)

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input.className).toContain('bg-[rgba(242,243,255,0.88)]')
    expect(input).toHaveClass('rounded-[8px]')
    expect(input.className).toContain('focus-visible:bg-white')
    expect(input.className).toContain('focus-visible:ring-2')
  })

  it('renders loading spinner without progressbar semantics and with flat neutral styling', () => {
    render(<Loading message="Loading..." />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toHaveClass('border-slate-900')
  })

  it('renders card primitives with flat border-first surface styling', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    )

    expect(screen.getByText('Metrics').closest('div')).toHaveClass('border-b')
    expect(screen.getByText('Body').closest('div')).toHaveClass('p-6')
  })

  it('renders status badge with semantic flat tone classes', () => {
    render(<StatusBadge status="accepted">Accepted</StatusBadge>)

    const badge = screen.getByText('Accepted')
    expect(badge.className).toContain('rounded-full')
    expect(badge.className).toContain('bg-emerald-50')
    expect(badge.className).toContain('text-emerald-700')
  })
})
