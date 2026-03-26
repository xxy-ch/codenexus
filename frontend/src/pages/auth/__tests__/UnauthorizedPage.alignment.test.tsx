import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UnauthorizedPage } from '../UnauthorizedPage'

describe('UnauthorizedPage alignment', () => {
  it('renders the restricted-access workbench language', () => {
    render(
      <MemoryRouter>
        <UnauthorizedPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '访问受限' })).toBeInTheDocument()
    expect(screen.getByText('当前账号已登录，但没有进入这个工作区的权限。')).toBeInTheDocument()
    expect(screen.getByText('受限能力')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回上一步' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到工作台' })).toHaveAttribute('href', '/dashboard')
  })
})
