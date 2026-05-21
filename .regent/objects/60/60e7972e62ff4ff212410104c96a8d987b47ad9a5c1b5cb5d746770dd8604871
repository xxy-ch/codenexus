import { useState, useEffect, useCallback, useRef } from 'react';
import type { MonitorSnapshot, WsMessage } from '../types';
import { useWebSocket } from './useWebSocket';

interface UseSnapshotOptions {
  /** Remote monitor-server base URL, e.g. http://localhost:4000 */
  serverUrl: string;
  /** REST polling interval in ms when WS is disconnected (default: 5000) */
  pollIntervalMs?: number;
}

interface UseSnapshotReturn {
  /** Latest snapshot data (null before first fetch) */
  snapshot: MonitorSnapshot | null;
  /** Loading state for the initial REST fetch */
  loading: boolean;
  /** Last error from REST fetch (null when healthy) */
  error: string | null;
  /** Current WebSocket connection state */
  wsState: ReturnType<typeof useWebSocket>['connectionState'];
  /** Force a manual refresh */
  refresh: () => void;
}

/**
 * Combines REST fetch + WebSocket real-time updates into a single snapshot state.
 *
 * Strategy:
 *  1. On mount, fetch the latest snapshot via GET /api/snapshot (REST).
 *  2. Open a WebSocket to /ws and push real-time snapshot updates.
 *  3. If WS disconnects, fall back to REST polling at pollIntervalMs.
 *  4. When WS reconnects, immediately request a fresh snapshot via REST.
 */
export function useSnapshot(opts: UseSnapshotOptions): UseSnapshotReturn {
  const { serverUrl, pollIntervalMs = 5000 } = opts;

  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Fetch snapshot via REST */
  const fetchSnapshot = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/snapshot`);
      if (!res.ok) {
        throw new Error(`GET /api/snapshot → ${res.status}`);
      }
      const data: MonitorSnapshot = await res.json();
      setSnapshot(data);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  /** Handle WS messages — update snapshot in real time */
  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.type === 'snapshot') {
      setSnapshot(msg.data);
      setError(null);
    }
    // 'control_update' messages are consumed by useControlApi
  }, []);

  const { connectionState: wsState } = useWebSocket({
    serverUrl,
    onMessage: handleWsMessage,
  });

  // Initial REST fetch
  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  // When WS disconnects, start REST polling; when connected, stop polling
  useEffect(() => {
    if (wsState === 'disconnected' || wsState === 'reconnecting') {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(fetchSnapshot, pollIntervalMs);
      }
    } else if (wsState === 'connected') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      // Refresh via REST when WS reconnects to catch up
      fetchSnapshot();
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [wsState, fetchSnapshot, pollIntervalMs]);

  return {
    snapshot,
    loading,
    error,
    wsState,
    refresh: fetchSnapshot,
  };
}
