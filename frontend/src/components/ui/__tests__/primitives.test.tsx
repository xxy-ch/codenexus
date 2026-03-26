import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SectionBlock } from '@/components/page/SectionBlock'
import { SurfaceCard } from '@/components/page/SurfaceCard'

describe('ui primitives', () => {
  it('renders primary button with flat design system classes and visible focus treatment', () => {
    render(<Button variant="primary">Sign In</Button>)

    const button = screen.getByRole('button', { name: 'Sign In' })
    expect(button.className).toContain('bg-[linear-gradient(135deg,#003d9b,#0052cc)]')
    expect(button).toHaveClass('text-white')
    expect(button).toHaveClass('rounded-[16px]')
    expect(button).toHaveClass('h-12')
    expect(button).toHaveClass('px-5')
    expect(button.className).toContain('focus-visible:ring-2')
  })

  it('renders input with flat surface classes and focus-visible border treatment', () => {
    render(<Input aria-label="Username" placeholder="1001" />)

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input.className).toContain('bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(237,242,255,0.96)_100%)]')
    expect(input).toHaveClass('h-[52px]')
    expect(input).toHaveClass('rounded-[18px]')
    expect(input.className).toContain('focus-visible:bg-white')
    expect(input.className).toContain('focus-visible:ring-4')
  })

  it('renders section blocks with elevated dashboard surfaces', () => {
    render(
      <SectionBlock title="概览" description="统一页块">
        Body
      </SectionBlock>,
    )

    const block = screen.getByRole('heading', { name: '概览' }).closest('section')
    expect(block).toHaveClass('rounded-[32px]')
    expect(block?.className || '').toContain('bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(245,248,253,0.92)_100%)]')
  })

  it('renders surface cards with stitched muted tones', () => {
    render(<SurfaceCard tone="muted">Body</SurfaceCard>)

    const card = screen.getByText('Body').closest('section')
    expect(card).toHaveClass('rounded-[24px]')
    expect(card?.className || '').toContain('bg-[linear-gradient(180deg,rgba(244,247,255,0.98)_0%,rgba(235,241,255,0.95)_100%)]')
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
