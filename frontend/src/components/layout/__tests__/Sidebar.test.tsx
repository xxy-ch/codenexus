import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from '@/components/layout/Sidebar'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      first_name: 'Ada',
      last_name: 'Lovelace',
      username: 'adal',
      role: 'teacher',
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

    expect(screen.getByText('AlgoMaster')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }))

    await waitFor(() => {
      expect(screen.queryByText('AlgoMaster')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
    })
  })

  it('restores a persisted collapsed preference from localStorage', () => {
    window.localStorage.setItem('sidebar-collapsed', 'true')

    renderSidebar()

    expect(screen.queryByText('AlgoMaster')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
  })

  it('keeps nav links accessible when collapsed', () => {
    window.localStorage.setItem('sidebar-collapsed', 'true')

    renderSidebar()

    const navigation = screen.getByRole('navigation')
    expect(within(navigation).getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: /problems/i })).toBeInTheDocument()
  })

  it('auto-collapses below the responsive breakpoint', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    renderSidebar()
    fireEvent(window, new Event('resize'))

    await waitFor(() => {
      expect(screen.queryByText('AlgoMaster')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument()
    })
  })
})
