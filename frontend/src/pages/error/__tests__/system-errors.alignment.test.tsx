import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotFound } from '../NotFound'
import { ServerError } from '../ServerError'

describe('system error alignment', () => {
  it('renders the redesigned 404 recovery page', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '页面未找到' })).toBeInTheDocument()
    expect(screen.getByText('这条路径在历史记录里存在，但当前没有挂载对应页面。')).toBeInTheDocument()
    expect(screen.getByText('恢复建议')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回工作台' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: '浏览题库' })).toHaveAttribute('href', '/problems')
  })

  it('renders the redesigned server error recovery page', () => {
    render(
      <MemoryRouter>
        <ServerError />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '服务暂时不可用' })).toBeInTheDocument()
    expect(screen.getByText('请求已经到达平台，但当前服务没有顺利完成处理。')).toBeInTheDocument()
    expect(screen.getByText('恢复建议')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '回到工作台' })).toHaveAttribute('href', '/dashboard')
  })
})
