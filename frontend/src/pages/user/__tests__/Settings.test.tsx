import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/test-utils'
import { Settings } from '../Settings'

// In-memory localStorage mock (jsdom env lacks native localStorage)
const localStorageStore = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => localStorageStore.get(key) ?? null,
  setItem: (key: string, value: string) => { localStorageStore.set(key, value) },
  removeItem: (key: string) => { localStorageStore.delete(key) },
  clear: () => { localStorageStore.clear() },
  get length() { return localStorageStore.size },
  key: (_index: number) => null,
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock the auth store to return a logged-in user
vi.mock('@/shared/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'student',
    },
    isAuthenticated: true,
  }),
}))

// Mock the users service to return profile data
vi.mock('@/services/users', () => ({
  usersService: {
    getMyProfile: vi.fn().mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
      email: 'test@example.com',
      display_name: 'Test User',
      organization_id: 1,
      role: 'student',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }),
    updateMyProfile: vi.fn().mockResolvedValue({ success: true }),
  },
}))

describe('Settings', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('loads preferences from localStorage on mount', async () => {
    const stored = {
      theme: 'dark',
      fontSize: 'large',
      autoSave: false,
      showLineNumbers: false,
      wordWrap: true,
    }
    localStorage.setItem('oj_preferences', JSON.stringify(stored))

    renderWithProviders(<Settings />)

    // Click the preferences tab to see the loaded theme
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /偏好/ }))

    await waitFor(() => {
      expect(screen.getByText('界面与编辑器偏好')).toBeInTheDocument()
    })

    // The custom select buttons should reflect stored values.
    await waitFor(() => {
      const selects = screen.getAllByRole('combobox')
      expect(selects[0]).toHaveTextContent('深色')
      expect(selects[1]).toHaveTextContent('大')
    })
  })

  it('writes preferences to localStorage when clicking save', async () => {
    renderWithProviders(<Settings />)

    const user = userEvent.setup()

    // Navigate to preferences tab
    await user.click(screen.getByRole('button', { name: /偏好/ }))

    // Wait for the tab content to render
    await waitFor(() => {
      expect(screen.getByText('界面与编辑器偏好')).toBeInTheDocument()
    })

    // Click the save button
    const saveButton = screen.getByRole('button', { name: /保存偏好/ })
    await user.click(saveButton)

    // Verify localStorage was written
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('oj_preferences') || '{}')
      expect(stored).toHaveProperty('theme')
      expect(stored).toHaveProperty('fontSize')
      expect(stored).toHaveProperty('autoSave')
      expect(stored).toHaveProperty('showLineNumbers')
      expect(stored).toHaveProperty('wordWrap')
    })
  })

  it('loads notifications from localStorage on mount', async () => {
    const stored = {
      emailNotifications: false,
      contestReminders: false,
      newProblems: true,
      replyComments: false,
      weeklyReport: false,
    }
    localStorage.setItem('oj_notifications', JSON.stringify(stored))

    renderWithProviders(<Settings />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /通知/ }))

    // Wait for the tab content
    await waitFor(() => {
      expect(screen.getByText('通知偏好')).toBeInTheDocument()
    })

    // The header card shows the count of enabled notifications.
    // With stored data: only newProblems is true, so count = 1.
    // We verify the card text to confirm the stored state loaded.
    await waitFor(() => {
      // The notification count in the header stat card
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('writes notifications to localStorage when clicking save', async () => {
    renderWithProviders(<Settings />)

    const user = userEvent.setup()

    // Navigate to notifications tab
    await user.click(screen.getByRole('button', { name: /通知/ }))

    // Wait for the tab content to render
    await waitFor(() => {
      expect(screen.getByText('通知偏好')).toBeInTheDocument()
    })

    // Click the save button
    const saveButton = screen.getByRole('button', { name: /保存通知设置/ })
    await user.click(saveButton)

    // Verify localStorage was written
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('oj_notifications') || '{}')
      expect(stored).toHaveProperty('emailNotifications')
      expect(stored).toHaveProperty('contestReminders')
      expect(stored).toHaveProperty('newProblems')
      expect(stored).toHaveProperty('replyComments')
      expect(stored).toHaveProperty('weeklyReport')
    })
  })

  it('displays profile data from useQuery in account form', async () => {
    renderWithProviders(<Settings />)

    // The account tab is default; wait for the profile data to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument()
  })
})
