import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InheritedIndicator } from '../InheritedIndicator'

describe('InheritedIndicator', () => {
  it('renders ArrowDownLeft icon', () => {
    render(<InheritedIndicator source="global" />)
    // The ArrowDownLeft SVG should be rendered
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('shows correct label for default source', () => {
    render(<InheritedIndicator source="default" />)
    expect(screen.getByText(/默认值/)).toBeInTheDocument()
  })

  it('shows correct label for global source', () => {
    render(<InheritedIndicator source="global" />)
    expect(screen.getByText(/全局/)).toBeInTheDocument()
  })

  it('shows correct label for campus source', () => {
    render(<InheritedIndicator source="campus" />)
    expect(screen.getByText(/校区/)).toBeInTheDocument()
  })

  it('shows correct label for grade source', () => {
    render(<InheritedIndicator source="grade" />)
    expect(screen.getByText(/年级/)).toBeInTheDocument()
  })
})
