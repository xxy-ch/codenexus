import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Settings } from '../Settings'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: null,
  }),
}))

describe('Settings truthfulness', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    localStorage.clear()
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <Settings />
      </QueryClientProvider>,
    )
  }

  it('persists preference toggles in the browser before claiming local effect', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: '偏好' }))
    await user.click(screen.getByRole('button', { name: '自动保存 自动保存代码草稿' }))

    expect(JSON.parse(localStorage.getItem('oj-settings-preferences') ?? '{}')).toMatchObject({
      autoSave: false,
    })
  })

  it('persists notification toggles in the browser before claiming local-only storage', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: '通知' }))
    await user.click(screen.getByRole('button', { name: '新题提醒' }))

    expect(JSON.parse(localStorage.getItem('oj-settings-notifications') ?? '{}')).toMatchObject({
      newProblems: true,
    })
  })
})
