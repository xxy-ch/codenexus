import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

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

vi.mock('@/shared/services/websocket', () => ({
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
vi.mock('@/shared/services/config', () => ({
  ConnectionStatus: {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
  },
  WS_CONFIG: { baseURL: 'ws://localhost:3000' },
}))

// Import the hook AFTER mocks are set up
import { useWebSocket } from '@/shared/hooks/useWebSocket'

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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

  afterEach(() => {
    vi.useRealTimers()
  })

  async function renderUseWebSocket() {
    let rendered: ReturnType<typeof renderHook<ReturnType<typeof useWebSocket>, unknown>> | undefined
    await act(async () => {
      rendered = renderHook(() => useWebSocket())
      await Promise.resolve()
    })
    return rendered!
  }

  it('connects on mount', async () => {
    mockGetStatus.mockReturnValue('connected')

    await renderUseWebSocket()

    // The hook calls connect on mount
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })

  it('disconnects on unmount', async () => {
    const { unmount } = await renderUseWebSocket()

    unmount()

    expect(mockDisconnect).toHaveBeenCalledTimes(1)
  })

  it('reflects connection error when connect fails', async () => {
    mockConnect.mockRejectedValue(new Error('Connection refused'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = await renderUseWebSocket()

    expect(mockConnect).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('error')
    expect(result.current.isConnected).toBe(false)
    consoleSpy.mockRestore()
  })

  it('polls status at regular intervals', async () => {
    await renderUseWebSocket()

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(mockGetStatus).toHaveBeenCalled()
  })

  it('exposes setHandlers to configure event handlers', async () => {
    const { result } = await renderUseWebSocket()

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
    const { result } = await renderUseWebSocket()

    await act(async () => {
      result.current.subscribe(42, 7)
    })

    expect(mockSubscribe).toHaveBeenCalledWith(42, 7)
  })

  it('exposes send for message transmission', async () => {
    mockSend.mockReturnValue(true)
    const { result } = await renderUseWebSocket()

    let sendResult: boolean = false
    await act(async () => {
      sendResult = result.current.send({ type: 'Ping', data: {} })
    })

    expect(mockSend).toHaveBeenCalledWith({ type: 'Ping', data: {} })
    expect(sendResult).toBe(true)
  })

  it('exposes the underlying websocket service', async () => {
    const { result } = await renderUseWebSocket()

    expect(result.current.service).toBeDefined()
    expect(result.current.service.connect).toBe(mockConnect)
    expect(result.current.service.disconnect).toBe(mockDisconnect)
  })

  it('reflects connected status when service reports connected', async () => {
    mockGetStatus.mockReturnValue('connected')

    const { result } = await renderUseWebSocket()

    expect(result.current.isConnected).toBe(true)
    expect(result.current.status).toBe('connected')
  })

  it('reflects disconnected status when not connected', async () => {
    mockGetStatus.mockReturnValue('disconnected')
    mockConnect.mockImplementation(() => new Promise(() => {}))

    const { result } = await renderUseWebSocket()

    expect(result.current.isConnected).toBe(false)
    expect(result.current.status).toBe('disconnected')
  })
})
