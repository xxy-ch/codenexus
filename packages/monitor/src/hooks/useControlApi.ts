import { useCallback, useState } from 'react';
import type {
  ControlTarget,
  ControlAction,
  ControlRequest,
  ControlPendingResponse,
  ConfirmRequest,
  ControlConfirmResponse,
  SignalStatusResponse,
  AuditLogResponse,
  AuditLogQuery,
} from '../types';

interface UseControlApiOptions {
  serverUrl: string;
}

interface UseControlApiReturn {
  /** Create a pending control signal (step 1 of two-step flow) */
  createSignal: (
    target: ControlTarget,
    action: ControlAction,
    operator: string,
  ) => Promise<ControlPendingResponse>;

  /** Confirm a pending control signal (step 2) */
  confirmSignal: (
    target: ControlTarget,
    action: ControlAction,
    token: string,
  ) => Promise<ControlConfirmResponse>;

  /** Read current signal status for a target */
  getStatus: (target: ControlTarget) => Promise<SignalStatusResponse>;

  /** Query audit log */
  getAuditLog: (query?: AuditLogQuery) => Promise<AuditLogResponse>;

  /** Last error from a control API call */
  lastError: string | null;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * Hook providing typed wrappers around the monitor-server control-plane REST API.
 *
 * All endpoints are prefixed with /api/control/.
 */
export function useControlApi(opts: UseControlApiOptions): UseControlApiReturn {
  const { serverUrl } = opts;
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  const apiFetch = useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      try {
        const res = await fetch(`${serverUrl}${path}`, {
          headers: { 'Content-Type': 'application/json' },
          ...init,
        });
        const body = await res.json();

        if (!res.ok) {
          const msg = body.error ?? `HTTP ${res.status}`;
          setLastError(msg);
          throw new Error(msg);
        }

        setLastError(null);
        return body as T;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setLastError(msg);
        throw err;
      }
    },
    [serverUrl],
  );

  const createSignal = useCallback(
    (target: ControlTarget, action: ControlAction, operator: string) => {
      const body: ControlRequest = { operator };
      return apiFetch<ControlPendingResponse>(
        `/api/control/services/${target}/${action}`,
        { method: 'POST', body: JSON.stringify(body) },
      );
    },
    [apiFetch],
  );

  const confirmSignal = useCallback(
    (target: ControlTarget, action: ControlAction, token: string) => {
      const body: ConfirmRequest = { confirmation_token: token };
      return apiFetch<ControlConfirmResponse>(
        `/api/control/services/${target}/${action}/confirm`,
        { method: 'POST', body: JSON.stringify(body) },
      );
    },
    [apiFetch],
  );

  const getStatus = useCallback(
    (target: ControlTarget) =>
      apiFetch<SignalStatusResponse>(`/api/control/services/${target}/status`),
    [apiFetch],
  );

  const getAuditLog = useCallback(
    (query?: AuditLogQuery) => {
      const params = new URLSearchParams();
      if (query?.limit) params.set('limit', String(query.limit));
      if (query?.target) params.set('target', query.target);
      const qs = params.toString();
      return apiFetch<AuditLogResponse>(
        `/api/control/audit-log${qs ? `?${qs}` : ''}`,
      );
    },
    [apiFetch],
  );

  return {
    createSignal,
    confirmSignal,
    getStatus,
    getAuditLog,
    lastError,
    clearError,
  };
}
