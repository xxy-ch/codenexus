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

describe('Settings', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <Settings />
      </QueryClientProvider>
    )
  }

  it('disables preference save action and clearly marks backend sync as unavailable', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: '偏好' }))

    expect(screen.getByRole('button', { name: '保存偏好' })).toBeDisabled()
    expect(screen.getByText('本地偏好立即生效；后端暂不支持偏好同步。')).toBeInTheDocument()
  })

  it('disables notification save action and clearly marks backend sync as unavailable', async () => {
    const user = userEvent.setup()
    renderComponent()

    await user.click(screen.getByRole('button', { name: '通知' }))

    expect(screen.getByRole('button', { name: '保存通知设置' })).toBeDisabled()
    expect(screen.getByText('通知开关仅保存在当前浏览器；后端暂不支持通知同步。')).toBeInTheDocument()
  })
})
