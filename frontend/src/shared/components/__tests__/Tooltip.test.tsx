import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@/test/test-utils'
import { Tooltip } from '../Tooltip'

describe('Tooltip', () => {
  it('renders children', () => {
    render(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    )
    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument()
  })

  it('does not show tooltip by default', () => {
    render(
      <Tooltip content="Hidden">
        <button>Trigger</button>
      </Tooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows tooltip on hover after delay', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Visible" delay={200}>
        <button>Hover</button>
      </Tooltip>
    )

    fireEvent.mouseEnter(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(200) })

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByText('Visible')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('hides tooltip on mouse leave', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Gone" delay={0}>
        <button>Hover</button>
      </Tooltip>
    )

    fireEvent.mouseEnter(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.mouseLeave(screen.getByRole('button'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('shows tooltip on focus', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Focused" delay={0}>
        <button>Focus me</button>
      </Tooltip>
    )

    fireEvent.focus(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(0) })

    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('hides tooltip on blur', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Blur" delay={0}>
        <button>Focus</button>
      </Tooltip>
    )

    fireEvent.focus(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.blur(screen.getByRole('button'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('applies custom className', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip content="Styled" delay={0} className="my-tooltip">
        <button>Hover</button>
      </Tooltip>
    )

    fireEvent.mouseEnter(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(0) })

    expect(screen.getByRole('tooltip')).toHaveClass('my-tooltip')
    vi.useRealTimers()
  })

  it('applies correct position classes for each side', async () => {
    vi.useFakeTimers()
    const { unmount } = render(
      <Tooltip content="Top" delay={0} side="top">
        <button>Top</button>
      </Tooltip>
    )
    fireEvent.mouseEnter(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(0) })
    expect(screen.getByRole('tooltip')).toHaveClass('bottom-full')
    unmount()

    vi.useRealTimers()
  })
})
