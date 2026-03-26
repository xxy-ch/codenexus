import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MainLayout } from '@/layouts/MainLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: ({ mode }: { mode?: 'workspace' | 'admin' }) => (
    <aside aria-label="Global sidebar">
      Sidebar {mode ?? 'workspace'}
      {mode === 'admin' ? (
        <nav aria-label="Admin navigation">
          <a href="/admin/users">Users</a>
          <a href="/admin/problems">Problem Management</a>
        </nav>
      ) : null}
    </aside>
  ),
}))

vi.mock('@/components/layout/Header', () => ({
  Header: () => <header>Workspace header</header>,
}))

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: ({ mode }: { mode?: 'workspace' | 'admin' }) => (
    <nav aria-label="Mobile navigation">Mobile nav {mode ?? 'workspace'}</nav>
  ),
}))

function renderMainLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="users" element={<div>Users page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('application shells', () => {
  it('renders the main shell with sidebar, header, mobile nav, and outlet content', () => {
    renderMainLayout()

    expect(screen.getByLabelText(/global sidebar/i)).toBeInTheDocument()
    expect(screen.getByText(/sidebar workspace/i)).toBeInTheDocument()
    expect(screen.getByText(/workspace header/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mobile navigation/i)).toBeInTheDocument()
    expect(screen.getByText(/dashboard page/i)).toBeInTheDocument()
  })

  it('uses the shared sidebar width variable for workspace content offset', () => {
    renderMainLayout()

    expect(screen.getByRole('main')).toHaveStyle({
      paddingLeft: 'var(--sidebar-shell-width, 96px)',
    })
  })

  it('renders the admin shell inside the same shell family with grouped navigation links', () => {
    renderAdminLayout()

    expect(screen.getByText(/sidebar admin/i)).toBeInTheDocument()
    expect(screen.getByText(/管理台/i)).toBeInTheDocument()
    expect(screen.getByText(/mobile nav admin/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /problem management/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /返回用户工作台/i })).toBeInTheDocument()
    expect(screen.getByText(/users page/i)).toBeInTheDocument()
  })

  it('uses the same shared sidebar width variable for admin content offset', () => {
    renderAdminLayout()

    expect(screen.getByRole('main')).toHaveStyle({
      paddingLeft: 'var(--sidebar-shell-width, 96px)',
    })
  })
})
