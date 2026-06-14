import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders accepted status', () => {
    render(<StatusBadge status="accepted" />)
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toHaveClass('text-status-accepted')
  })

  it('renders wrong_answer status', () => {
    render(<StatusBadge status="wrong_answer" />)
    expect(screen.getByText('Wrong Answer')).toBeInTheDocument()
    expect(screen.getByText('Wrong Answer')).toHaveClass('text-destructive')
  })

  it('renders time_limit_exceeded status', () => {
    render(<StatusBadge status="time_limit_exceeded" />)
    expect(screen.getByText('Time Limit Exceeded')).toBeInTheDocument()
  })

  it('renders memory_limit_exceeded status', () => {
    render(<StatusBadge status="memory_limit_exceeded" />)
    expect(screen.getByText('Memory Limit Exceeded')).toBeInTheDocument()
  })

  it('renders compilation_error status', () => {
    render(<StatusBadge status="compilation_error" />)
    expect(screen.getByText('Compilation Error')).toBeInTheDocument()
    expect(screen.getByText('Compilation Error')).toHaveClass('text-status-re')
  })

  it('renders runtime_error status', () => {
    render(<StatusBadge status="runtime_error" />)
    expect(screen.getByText('Runtime Error')).toBeInTheDocument()
  })

  it('renders pending status with pulse animation', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
    const dot = screen.getByText('Pending').querySelector('span')
    expect(dot).toHaveClass('animate-pulse')
  })

  it('renders running status with pulse animation', () => {
    render(<StatusBadge status="running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()
    const dot = screen.getByText('Running').querySelector('span')
    expect(dot).toHaveClass('animate-pulse')
  })

  it('includes status dot indicator', () => {
    const { container } = render(<StatusBadge status="accepted" />)
    const dot = container.querySelector('.w-1\\.5')
    expect(dot).toBeInTheDocument()
    expect(dot).toHaveClass('rounded-full')
  })

  it('applies custom className', () => {
    render(<StatusBadge status="accepted" className="extra-class" />)
    expect(screen.getByText('Accepted')).toHaveClass('extra-class')
  })
})
