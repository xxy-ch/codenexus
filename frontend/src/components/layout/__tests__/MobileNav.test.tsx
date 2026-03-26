import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MobileNav } from '@/components/layout/MobileNav'

describe('MobileNav', () => {
  it('uses the shared tablet breakpoint and renders workspace items by default', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileNav />
      </MemoryRouter>,
    )

    const nav = screen.getByLabelText(/mobile navigation/i)
    expect(nav).toHaveClass('md:hidden')
    expect(screen.getByRole('link', { name: /首页/i })).toHaveAttribute('href', '/dashboard')
  })

  it('renders the full admin mobile nav and only marks the nested route as active', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <MobileNav mode="admin" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /总览/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('link', { name: /内容/i })).toHaveAttribute('href', '/admin/problem-content')
    expect(screen.getByRole('link', { name: /返回/i })).toHaveAttribute('href', '/dashboard')

    expect(screen.getByRole('link', { name: /总览/i }).className).not.toContain('text-slate-950')
    expect(screen.getByRole('link', { name: /用户/i }).className).toContain('text-slate-950')
  })
})
