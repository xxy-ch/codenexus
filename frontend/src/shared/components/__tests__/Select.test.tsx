import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Select } from '../Select'

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

describe('Select', () => {
  it('renders with placeholder', () => {
    render(<Select options={options} placeholder="Pick theme" />)
    expect(screen.getByText('Pick theme')).toBeInTheDocument()
  })

  it('renders selected value', () => {
    render(<Select options={options} value="dark" />)
    expect(screen.getByText('Dark')).toBeInTheDocument()
  })

  it('opens dropdown on click', async () => {
    const user = userEvent.setup()
    render(<Select options={options} />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Light' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Dark' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'System' })).toBeInTheDocument()
  })

  it('selects option and calls onValueChange', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<Select options={options} onValueChange={onValueChange} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'Dark' }))

    expect(onValueChange).toHaveBeenCalledWith('dark')
  })

  it('renders disabled state', () => {
    render(<Select options={options} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('shows error message', () => {
    render(<Select options={options} error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('renders glass variant', () => {
    render(<Select options={options} variant="glass" />)
    expect(screen.getByRole('combobox')).toHaveClass('bg-card')
  })

  it('has correct ARIA attributes', async () => {
    const user = userEvent.setup()
    render(<Select options={options} />)

    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})
