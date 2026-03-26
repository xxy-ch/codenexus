import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'

const { authState } = vi.hoisted(() => ({
  authState: {
    role: 'teacher' as 'user' | 'teacher' | 'admin',
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      first_name: 'Ada',
      last_name: 'Lovelace',
      username: 'adal',
      role: authState.role,
    },
    logout: vi.fn(),
  }),
}))

function renderSidebar(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

function createLocalStorageMock() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
  authState.role = 'teacher'
  const localStorageMock = createLocalStorageMock()
  vi.stubGlobal('localStorage', localStorageMock)
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: localStorageMock,
  })
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1440,
  })
})

describe('Sidebar', () => {
  it('toggles between expanded and collapsed states', async () => {
    renderSidebar()

    expect(screen.getByText('建筑算法学社')).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--sidebar-shell-width')).toBe('288px')

    fireEvent.click(screen.getByRole('button', { name: /收起侧栏/i }))

    await waitFor(() => {
      expect(screen.queryByText('建筑算法学社')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /展开侧栏/i })).toBeInTheDocument()
      expect(document.documentElement.style.getPropertyValue('--sidebar-shell-width')).toBe('96px')
    })
  })

  it('restores a persisted collapsed preference from localStorage', () => {
    window.localStorage.setItem('sidebar-collapsed', 'true')

    renderSidebar()

    expect(screen.queryByText('建筑算法学社')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /展开侧栏/i })).toBeInTheDocument()
    expect(document.documentElement.style.getPropertyValue('--sidebar-shell-width')).toBe('96px')
  })

  it('keeps nav links accessible when collapsed', () => {
    window.localStorage.setItem('sidebar-collapsed', 'true')

    renderSidebar()

    const navigation = screen.getByRole('navigation')
    expect(within(navigation).getByRole('link', { name: /首页/i })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: /题库/i })).toBeInTheDocument()
  })

  it('does not expose teacher navigation items to student users', () => {
    authState.role = 'user'

    renderSidebar()

    const navigation = screen.getByRole('navigation')
    expect(within(navigation).queryByRole('link', { name: /班级/i })).not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: /竞赛编排/i })).not.toBeInTheDocument()
    expect(within(navigation).queryByRole('link', { name: /报告/i })).not.toBeInTheDocument()
  })

  it('auto-collapses below the responsive breakpoint', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    renderSidebar()
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(screen.queryByText('建筑算法学社')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /展开侧栏/i })).toBeInTheDocument()
    })
  })
})
