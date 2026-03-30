import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/ui/StatusBadge'

describe('StatusBadge regression', () => {
  it('renders judged submissions without crashing', () => {
    render(<StatusBadge status={'judged' as any} />)

    expect(screen.getByText('Judged')).toBeInTheDocument()
  })
})
