import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Switch } from '../Switch'

describe('Switch', () => {
  it('renders unchecked by default', () => {
    render(<Switch />)
    const switchEl = screen.getByRole('checkbox')
    expect(switchEl).not.toBeChecked()
  })

  it('renders checked state', () => {
    render(<Switch checked={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('toggles on click', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders with label', () => {
    render(<Switch label="Enable dark mode" />)
    expect(screen.getByText('Enable dark mode')).toBeInTheDocument()
  })

  it('label click toggles switch', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Switch label="Toggle" onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByText('Toggle'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders disabled state', () => {
    render(<Switch disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('shows error state', () => {
    render(<Switch error="Switch error" />)
    expect(screen.getByText('Switch error')).toBeInTheDocument()
  })
})
