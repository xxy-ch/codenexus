/**
 * React Hook for WebSocket
 * Provides easy integration with real-time updates
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { websocketService } from '../services/websocket'
import type { WebSocketEventHandlers } from '../types/websocket'
import { ConnectionStatus, type ConnectionStatus as ConnectionStatusType } from '../services/config'

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatusType>(ConnectionStatus.DISCONNECTED)
  const handlersRef = useRef<WebSocketEventHandlers>({})

  // Update status when service status changes
  useEffect(() => {
    const checkStatus = setInterval(() => {
      setStatus(websocketService.getStatus())
    }, 100)

    return () => clearInterval(checkStatus)
  }, [])

  // Connect on mount
  useEffect(() => {
    let mounted = true

    websocketService.connect()
      .then(() => {
        if (mounted) {
          setStatus(ConnectionStatus.CONNECTED)
        }
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error)
        if (mounted) {
          setStatus(ConnectionStatus.ERROR)
        }
      })

    return () => {
      mounted = false
      websocketService.disconnect()
    }
  }, [])

  // Set up handlers
  const setHandlers = useCallback((handlers: WebSocketEventHandlers) => {
    handlersRef.current = handlers
    websocketService.setHandlers(handlers)
  }, [])

  // Subscribe to topics
  const subscribe = useCallback((submissionId?: number, contestId?: number) => {
    websocketService.subscribe(submissionId, contestId)
  }, [])

  // Send message
  const send = useCallback((message: any) => {
    return websocketService.send(message)
  }, [])

  return {
    status,
    isConnected: status === ConnectionStatus.CONNECTED,
    setHandlers,
    subscribe,
    send,
    service: websocketService,
  }
}

/**
 * Hook for submission updates
 */
export function useSubmissionUpdates(submissionId?: number) {
  const [update, setUpdate] = useState<any>(null)
  const { status, isConnected, subscribe, setHandlers } = useWebSocket()

  useEffect(() => {
    setHandlers({
      onSubmissionUpdate: (data) => {
        if (!submissionId || data.submission_id === submissionId) {
          setUpdate(data)
        }
      },
    })
  }, [submissionId, setHandlers])

  useEffect(() => {
    if (isConnected && submissionId) {
      subscribe(submissionId)
    }
  }, [isConnected, submissionId, subscribe])

  return {
    update,
    status,
    isConnected,
  }
}

/**
 * Hook for contest updates
 */
export function useContestUpdates(contestId?: number) {
  const [update, setUpdate] = useState<any>(null)
  const { status, isConnected, subscribe, setHandlers } = useWebSocket()

  useEffect(() => {
    setHandlers({
      onContestUpdate: (data) => {
        if (!contestId || data.contest_id === contestId) {
          setUpdate(data)
        }
      },
    })
  }, [contestId, setHandlers, status])

  useEffect(() => {
    if (isConnected && contestId) {
      subscribe(undefined, contestId)
    }
  }, [isConnected, contestId, subscribe])

  return {
    update,
    status,
    isConnected,
  }
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const { status, isConnected, setHandlers } = useWebSocket()

  useEffect(() => {
    setHandlers({
      onNotification: (data) => {
        setNotifications((prev) => [...prev, data])

        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: '/favicon.svg',
          })
        }
      },
    })
  }, [setHandlers, status])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  return {
    notifications,
    status,
    isConnected,
    clear: () => setNotifications([]),
  }
}

/**
 * Hook for leaderboard updates
 */
export function useLeaderboardUpdates(scope: string, scopeId?: number) {
  const [update, setUpdate] = useState<any>(null)
  const { status, isConnected, setHandlers } = useWebSocket()

  useEffect(() => {
    setHandlers({
      onLeaderboardUpdate: (data) => {
        if (data.scope === scope && (!scopeId || data.scope_id === scopeId)) {
          setUpdate(data)
        }
      },
    })
  }, [scope, scopeId, setHandlers, status])

  return {
    update,
    status,
    isConnected,
  }
}
