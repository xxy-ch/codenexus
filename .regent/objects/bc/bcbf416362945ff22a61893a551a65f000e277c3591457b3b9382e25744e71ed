import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '../Checkbox'

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('renders with checked state', () => {
    render(<Checkbox checked={true} />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('toggles on click', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />)
    expect(screen.getByText('Accept terms')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('label click toggles checkbox', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Click me" onCheckedChange={onCheckedChange} />)

    await user.click(screen.getByText('Click me'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('renders disabled state', () => {
    render(<Checkbox disabled label="Disabled" />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('shows error message', () => {
    render(<Checkbox error="Required" />)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText('Required')).toHaveClass('text-destructive')
  })

  it('supports indeterminate state', () => {
    render(<Checkbox checked="indeterminate" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })
})
