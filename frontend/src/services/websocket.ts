/**
 * WebSocket Client Service
 * Manages real-time communication with the backend
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  WebSocketMessage,
  WebSocketEventHandlers,
  SubmissionUpdateMessage,
  ChatMessage,
} from '../types/websocket'
import { ConnectionStatus, WS_CONFIG } from './config'

class WebSocketService {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED
  private handlers: WebSocketEventHandlers = {}
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private subscriptions: Set<string> = new Set()
  private userId: string | null = null
  private username: string | null = null

  /**
   * Connect to WebSocket server
   */
  connect(userId?: string, username?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.userId = userId || this.getUserIdFromStorage()
        this.username = username || this.getUsernameFromStorage()

        const wsUrl = WS_CONFIG.baseURL + '/ws'
        console.log('[WebSocket] Connecting to:', wsUrl)

        this.ws = new WebSocket(wsUrl)
        this.status = ConnectionStatus.CONNECTING

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected')
          this.status = ConnectionStatus.CONNECTED
          this.reconnectAttempts = 0
          this.startPing()

          // Send authentication message
          this.authenticate()

          this.handlers.onConnected?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          this.status = ConnectionStatus.ERROR
          this.handlers.onError?.(error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected')
          this.status = ConnectionStatus.DISCONNECTED
          this.stopPing()
          this.handlers.onDisconnected?.()

          // Attempt to reconnect
          this.attemptReconnect()
        }
      } catch (error) {
        console.error('[WebSocket] Connection error:', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.status = ConnectionStatus.DISCONNECTED
    this.subscriptions.clear()
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = handlers
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): boolean {
    if (this.ws && this.status === ConnectionStatus.CONNECTED) {
      try {
        this.ws.send(JSON.stringify(message))
        return true
      } catch (error) {
        console.error('[WebSocket] Send error:', error)
        return false
      }
    }
    return false
  }

  /**
   * Subscribe to a topic (by sending a message of that type)
   */
  subscribe(submissionId?: number, contestId?: number): void {
    if (submissionId !== undefined) {
      const topic = `submission:${submissionId}`
      if (!this.subscriptions.has(topic)) {
        this.send({
          type: 'SubmissionUpdate',
          data: { submission_id: submissionId, user_id: '', problem_id: 0, status: '' }
        } as SubmissionUpdateMessage)
        this.subscriptions.add(topic)
        console.log('[WebSocket] Subscribed to:', topic)
      }
    }

    if (contestId !== undefined) {
      const topic = `contest:${contestId}`
      if (!this.subscriptions.has(topic)) {
        this.send({
          type: 'ContestUpdate',
          data: { contest_id: contestId, status: 'started' }
        })
        this.subscriptions.add(topic)
        console.log('[WebSocket] Subscribed to:', topic)
      }
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.status
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === ConnectionStatus.CONNECTED
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      console.log('[WebSocket] Received:', message.type)

      // Call generic handler
      this.handlers.onMessage?.(message)

      // Call specific handlers
      switch (message.type) {
        case 'SubmissionUpdate':
          this.handlers.onSubmissionUpdate?.(message.data)
          break
        case 'LeaderboardUpdate':
          this.handlers.onLeaderboardUpdate?.(message.data)
          break
        case 'Notification':
          this.handlers.onNotification?.(message.data)
          break
        case 'ContestUpdate':
          this.handlers.onContestUpdate?.(message.data)
          break
        case 'ProblemStats':
          this.handlers.onProblemStats?.(message.data)
          break
        case 'ChatMessage':
          this.handlers.onChatMessage?.(message.data)
          break
        case 'Pong':
          // Pong received, connection is alive
          break
        case 'Error':
          console.error('[WebSocket] Server error:', message.data)
          break
      }
    } catch (error) {
      console.error('[WebSocket] Message parse error:', error)
    }
  }

  /**
   * Send authentication message
   */
  private authenticate(): void {
    if (!this.userId || !this.username) {
      console.warn('[WebSocket] No user credentials, skipping auth')
      return
    }

    const authMessage: ChatMessage = {
      type: 'ChatMessage',
      data: {
        id: uuidv4(),
        contest_id: 0, // Temp value
        user_id: this.userId,
        username: this.username,
        message: '',
        timestamp: new Date().toISOString(),
      }
    }

    this.send(authMessage)
    console.log('[WebSocket] Authentication sent')
  }

  /**
   * Start ping/pong heartbeat
   */
  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send({
        type: 'Ping',
        data: { timestamp: Date.now() }
      })
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop ping/pong heartbeat
   */
  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * this.reconnectAttempts

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.userId || undefined, this.username || undefined).catch((error) => {
        console.error('[WebSocket] Reconnect failed:', error)
      })
    }, delay)
  }

  /**
   * Get user ID from localStorage
   */
  private getUserIdFromStorage(): string | null {
    try {
      const userStr = localStorage.getItem('oj_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.id || null
      }
    } catch (error) {
      console.error('[WebSocket] Error reading user from storage:', error)
    }
    return null
  }

  /**
   * Get username from localStorage
   */
  private getUsernameFromStorage(): string | null {
    try {
      const userStr = localStorage.getItem('oj_user')
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.username || user.email || null
      }
    } catch (error) {
      console.error('[WebSocket] Error reading username from storage:', error)
    }
    return null
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()

// Export hook for React components
export function useWebSocket() {
  return {
    service: websocketService,
    status: websocketService.getStatus(),
    isConnected: websocketService.isConnected(),
    connect: (userId?: string, username?: string) => websocketService.connect(userId, username),
    disconnect: () => websocketService.disconnect(),
    subscribe: (submissionId?: number, contestId?: number) => websocketService.subscribe(submissionId, contestId),
  }
}
