import { render, screen } from '@testing-library/react'
import { Clock3 } from 'lucide-react'
import { MetaStrip } from '@/components/page/MetaStrip'

describe('MetaStrip', () => {
  it('renders compact inline metadata items without helper text breaking onto separate cards', () => {
    render(
      <MetaStrip
        items={[
          { label: 'Difficulty', value: 'Easy', helper: '根据题目配置读取' },
          { label: 'Time Limit', value: '1000 ms', helper: '单次运行上限', icon: Clock3 },
        ]}
      />,
    )

    expect(screen.getByText('Difficulty')).toBeInTheDocument()
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('根据题目配置读取')).toBeInTheDocument()
    expect(screen.getByText('1000 ms')).toBeInTheDocument()
    expect(screen.getByText('单次运行上限')).toBeInTheDocument()
    expect(screen.getByTestId('meta-strip')).toHaveClass('flex-nowrap')
  })
})
