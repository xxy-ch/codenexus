import { useRef, useEffect, useCallback, useState } from 'react';
import type { WsMessage, ConnectionState } from '../types';

interface UseWebSocketOptions {
  /** Remote server base URL, e.g. http://localhost:4000 */
  serverUrl: string;
  /** Called for each parsed WebSocket message */
  onMessage: (msg: WsMessage) => void;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState) => void;
  /** Auto-reconnect (default: true) */
  reconnect?: boolean;
  /** Maximum backoff in ms (default: 30 000) */
  maxBackoffMs?: number;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  reconnectAttempt: number;
  /** Send a raw string over the socket */
  send: (data: string) => void;
  /** Force-close and reconnect */
  reconnect: () => void;
}

/**
 * WebSocket hook with exponential backoff reconnection.
 *
 * The WS URL is derived from serverUrl by replacing http→ws / https→wss.
 * On disconnect the hook backs off exponentially (1s, 2s, 4s, …) up to
 * maxBackoffMs and attempts reconnection automatically.
 */
export function useWebSocket(opts: UseWebSocketOptions): UseWebSocketReturn {
  const {
    serverUrl,
    onMessage,
    onStateChange,
    reconnect: shouldReconnect = true,
    maxBackoffMs = 30_000,
  } = opts;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const onStateChangeRef = useRef(onStateChange);

  // Keep callback refs fresh
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const setState = useCallback((s: ConnectionState) => {
    setConnectionState(s);
    onStateChangeRef.current?.(s);
  }, []);

  /** Derive WS URL from serverUrl */
  const wsUrl = serverUrl
    .replace(/^http/, 'ws')
    .replace(/\/+$/, '') + '/ws';

  const connect = useCallback(() => {
    // Cleanup previous
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      if (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
    }

    setState('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
      setReconnectAttempt(0);
      setState('connected');
    };

    ws.onmessage = (ev) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data);
        onMessageRef.current(msg);
      } catch {
        console.warn('[monitor] failed to parse WS message:', ev.data);
      }
    };

    ws.onclose = (ev) => {
      setState('disconnected');
      if (ev.code !== 1000 && shouldReconnect) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }, [wsUrl, shouldReconnect, setState]);

  const scheduleReconnect = useCallback(() => {
    const attempt = attemptRef.current + 1;
    attemptRef.current = attempt;

    const delay = Math.min(1000 * Math.pow(2, attempt - 1), maxBackoffMs);
    const jitter = delay * (0.8 + Math.random() * 0.4); // ±20%

    console.log(
      `[monitor] WS reconnecting in ${Math.round(jitter)}ms (attempt ${attempt})`
    );

    setState('reconnecting');
    setReconnectAttempt(attempt);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, jitter);
  }, [connect, maxBackoffMs, setState]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const manualReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    attemptRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connectionState,
    reconnectAttempt,
    send,
    reconnect: manualReconnect,
  };
}
