import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from '@/components/layout/Header'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      username: 'ada',
      display_name: 'Ada Lovelace',
      role: 'teacher',
    },
  }),
}))

describe('Header', () => {
  function LocationProbe() {
    const location = useLocation()
    return <div data-testid="location">{location.pathname}{location.search}</div>
  }

  it('submits the global search box into the search route query string', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Header />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByPlaceholderText(/搜索题目、竞赛或用户/i), 'two sum')
    await user.keyboard('{Enter}')

    expect(screen.getByRole('textbox')).toHaveValue('two sum')
    expect(screen.getByTestId('location')).toHaveTextContent('/search?q=two%20sum')
    expect(screen.getByRole('link', { name: /通知设置/i })).toHaveAttribute('href', '/settings?tab=notifications')
  })

  it('keeps header controls on the same proportional sizing system as shared primitives', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="*" element={<Header />} />
        </Routes>
      </MemoryRouter>,
    )

    const searchInput = screen.getByRole('textbox', { name: '全局搜索' })
    const searchForm = searchInput.closest('form')
    const notificationsLink = screen.getByRole('link', { name: /通知设置/i })
    const settingsLink = screen.getByLabelText('设置')

    expect(searchForm?.className || '').toContain('h-[52px]')
    expect(searchForm?.className || '').toContain('rounded-[18px]')
    expect(searchForm?.className || '').toContain('max-w-[400px]')
    expect(notificationsLink.className).toContain('h-12')
    expect(notificationsLink.className).toContain('w-12')
    expect(settingsLink.className).toContain('h-12')
    expect(settingsLink.className).toContain('w-12')
  })
})
