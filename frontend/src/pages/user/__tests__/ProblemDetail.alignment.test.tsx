import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProblemDetail } from '../ProblemDetail'

describe('ProblemDetail alignment', () => {
  it('renders the reference-style two-column detail layout with action and related panels', () => {
    render(
      <MemoryRouter>
        <ProblemDetail />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '天际线切分优化' })).toBeInTheDocument()
    expect(screen.getByText('题目洞察')).toBeInTheDocument()
    expect(screen.getByText('相关挑战')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /提交代码/ })).toHaveAttribute('href', '/problems/1/solve')
    expect(screen.getByText('示例 1')).toBeInTheDocument()
    expect(screen.getByText('约束与限制')).toBeInTheDocument()
  })
})
