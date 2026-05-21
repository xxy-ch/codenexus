import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Use vi.hoisted so mock functions are available when vi.mock factory runs
const {
  mockConnect,
  mockDisconnect,
  mockGetStatus,
  mockSetHandlers,
  mockSubscribe,
  mockSend,
} = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
  mockGetStatus: vi.fn(),
  mockSetHandlers: vi.fn(),
  mockSubscribe: vi.fn(),
  mockSend: vi.fn(),
}))

vi.mock('@/services/websocket', () => ({
  websocketService: {
    connect: mockConnect,
    disconnect: mockDisconnect,
    getStatus: mockGetStatus,
    setHandlers: mockSetHandlers,
    subscribe: mockSubscribe,
    send: mockSend,
  },
}))

// Mock the config module for ConnectionStatus
vi.mock('@/services/config', () => ({
  ConnectionStatus: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
  },
  WS_CONFIG: { baseURL: 'ws://localhost:3000' },
}))

// Import the hook AFTER mocks are set up
import { useWebSocket } from '@/hooks/useWebSocket'

describe('useWebSocket', () => {
  beforeEach(() => {
    mockConnect.mockReset()
    mockDisconnect.mockReset()
    mockGetStatus.mockReset()
    mockSetHandlers.mockReset()
    mockSubscribe.mockReset()
    mockSend.mockReset()

    // Default: status polling returns DISCONNECTED
    mockGetStatus.mockReturnValue('disconnected')
    // Default: connect resolves successfully
    mockConnect.mockResolvedValue(undefined)
  })

  it('connects on mount', async () => {
    mockGetStatus.mockReturnValue('connected')

    renderHook(() => useWebSocket())

    // The hook calls connect on mount
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket())

    unmount()

    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('reflects connection error when connect fails', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'))

    const { result } = renderHook(() => useWebSocket())

    // Wait for the connect promise to reject and status to update
    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1)
    })

    expect(result.current.isConnected).toBe(false)
  })

  it('polls status at regular intervals', async () => {
    renderHook(() => useWebSocket())

    // The hook sets up a 100ms interval to poll getStatus.
    // Wait for at least one polling cycle with real timers.
    await waitFor(
      () => {
        expect(mockGetStatus).toHaveBeenCalled()
      },
      { timeout: 500 },
    )
  })

  it('exposes setHandlers to configure event handlers', async () => {
    const { result } = renderHook(() => useWebSocket())

    const handlers = {
      onSubmissionUpdate: vi.fn(),
      onContestUpdate: vi.fn(),
    }

    await act(async () => {
      result.current.setHandlers(handlers)
    })

    expect(mockSetHandlers).toHaveBeenCalledWith(handlers)
  })

  it('exposes subscribe for topic subscription', async () => {
    const { result } = renderHook(() => useWebSocket())

    await act(async () => {
      result.current.subscribe(42, 7)
    })

    expect(mockSubscribe).toHaveBeenCalledWith(42, 7)
  })

  it('exposes send for message transmission', async () => {
    mockSend.mockReturnValue(true)
    const { result } = renderHook(() => useWebSocket())

    let sendResult: boolean = false
    await act(async () => {
      sendResult = result.current.send({ type: 'Ping', data: {} })
    })

    expect(mockSend).toHaveBeenCalledWith({ type: 'Ping', data: {} })
    expect(sendResult).toBe(true)
  })

  it('exposes the underlying websocket service', async () => {
    const { result } = renderHook(() => useWebSocket())

    expect(result.current.service).toBeDefined()
    expect(result.current.service.connect).toBe(mockConnect)
    expect(result.current.service.disconnect).toBe(mockDisconnect)
  })

  it('reflects connected status when service reports connected', async () => {
    mockGetStatus.mockReturnValue('connected')

    const { result } = renderHook(() => useWebSocket())

    // Wait for the polling interval to pick up the connected status
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.status).toBe('connected')
    })
  })

  it('reflects disconnected status when not connected', async () => {
    mockGetStatus.mockReturnValue('disconnected')

    const { result } = renderHook(() => useWebSocket())

    expect(result.current.isConnected).toBe(false)
    expect(result.current.status).toBe('disconnected')
  })
})
