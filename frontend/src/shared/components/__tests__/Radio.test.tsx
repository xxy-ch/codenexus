import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { RadioGroup } from '../Radio'

const options = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

describe('RadioGroup', () => {
  it('renders all options', () => {
    render(<RadioGroup options={options} />)
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('has radiogroup role', () => {
    render(<RadioGroup options={options} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('renders radio inputs', () => {
    render(<RadioGroup options={options} />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
  })

  it('selects option on click', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<RadioGroup options={options} onValueChange={onValueChange} />)

    await user.click(screen.getByText('Medium'))
    expect(onValueChange).toHaveBeenCalledWith('medium')
  })

  it('shows selected value', () => {
    render(<RadioGroup options={options} value="hard" />)
    const radio = screen.getByRole('radio', { checked: true })
    expect(radio).toHaveAttribute('value', 'hard')
  })

  it('renders vertical orientation by default', () => {
    render(<RadioGroup options={options} />)
    expect(screen.getByRole('radiogroup')).toHaveClass('flex-col')
  })

  it('renders horizontal orientation', () => {
    render(<RadioGroup options={options} orientation="horizontal" />)
    expect(screen.getByRole('radiogroup')).toHaveClass('flex-row')
  })

  it('shows error message', () => {
    render(<RadioGroup options={options} error="Pick one" />)
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })

  it('respects disabled options', () => {
    const disabledOptions = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ]
    render(<RadioGroup options={disabledOptions} />)
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).not.toBeDisabled()
    expect(radios[1]).toBeDisabled()
  })
})
