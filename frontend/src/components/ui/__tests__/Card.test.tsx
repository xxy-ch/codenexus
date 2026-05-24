import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card'

describe('Card', () => {
  it('renders with default variant', () => {
    render(<Card>Card content</Card>)
    const card = screen.getByText('Card content')
    expect(card).toHaveAttribute('data-slot', 'card')
    expect(card).toHaveClass('rounded-[10px]')
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('shadow-card')
  })

  it('renders glass variant', () => {
    render(<Card variant="glass">Glass card</Card>)
    const card = screen.getByText('Glass card')
    expect(card).toHaveClass('backdrop-blur-2xl')
    expect(card).toHaveClass('bg-background/65')
  })

  it('renders elevated variant', () => {
    render(<Card variant="elevated">Elevated</Card>)
    const card = screen.getByText('Elevated')
    expect(card).toHaveClass('shadow-elevated')
  })

  it('renders outlined variant', () => {
    render(<Card variant="outlined">Outlined</Card>)
    const card = screen.getByText('Outlined')
    expect(card).toHaveClass('border')
    expect(card).toHaveClass('border-border')
  })

  it('renders small size', () => {
    render(<Card size="sm">Small</Card>)
    const card = screen.getByText('Small')
    expect(card).toHaveAttribute('data-size', 'sm')
  })

  it('renders compound components together', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText('Title')).toHaveAttribute('data-slot', 'card-title')
    expect(screen.getByText('Description')).toHaveAttribute('data-slot', 'card-description')
    expect(screen.getByText('Content')).toHaveAttribute('data-slot', 'card-content')
    expect(screen.getByText('Footer')).toHaveAttribute('data-slot', 'card-footer')
  })

  it('applies custom className', () => {
    render(<Card className="my-card">Custom</Card>)
    expect(screen.getByText('Custom')).toHaveClass('my-card')
  })
})
