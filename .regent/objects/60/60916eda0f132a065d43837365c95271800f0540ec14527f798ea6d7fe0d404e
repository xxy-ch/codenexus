import { useState, useCallback } from 'react';
import type { ControlTarget, ControlAction } from '../types';
import { useControlApi } from '../hooks/useControlApi';

interface UseTwoStepConfirmOptions {
  serverUrl: string;
  onComplete?: (target: ControlTarget, action: ControlAction) => void;
  onError?: (error: string) => void;
}

interface UseTwoStepConfirmReturn {
  /** Currently pending confirmation (null if idle) */
  pending: { target: ControlTarget; action: ControlAction; token: string } | null;
  /** Is a request in flight? */
  submitting: boolean;
  /** Error message */
  error: string | null;
  /** Step 1: Create a pending signal */
  initiate: (target: ControlTarget, action: ControlAction, operator: string) => Promise<void>;
  /** Step 2: Confirm the pending signal */
  confirm: () => Promise<void>;
  /** Cancel the pending confirmation */
  cancel: () => void;
}

/**
 * Two-step confirmation flow for control signals.
 *
 * Step 1 (initiate): Creates a pending signal and stores the confirmation token.
 * Step 2 (confirm): Sends the confirmation token to activate the signal.
 * The user must explicitly call confirm() after initiate() succeeds.
 */
export function useTwoStepConfirm(opts: UseTwoStepConfirmOptions): UseTwoStepConfirmReturn {
  const { serverUrl, onComplete, onError } = opts;
  const { createSignal, confirmSignal } = useControlApi({ serverUrl });

  const [pending, setPending] = useState<UseTwoStepConfirmReturn['pending']>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiate = useCallback(
    async (target: ControlTarget, action: ControlAction, operator: string) => {
      setSubmitting(true);
      setError(null);
      try {
        const resp = await createSignal(target, action, operator);
        setPending({ target, action, token: resp.confirmation_token });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError?.(msg);
      } finally {
        setSubmitting(false);
      }
    },
    [createSignal, onError],
  );

  const confirm = useCallback(async () => {
    if (!pending) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmSignal(pending.target, pending.action, pending.token);
      const { target, action } = pending;
      setPending(null);
      onComplete?.(target, action);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }, [pending, confirmSignal, onComplete, onError]);

  const cancel = useCallback(() => {
    setPending(null);
    setError(null);
  }, []);

  return { pending, submitting, error, initiate, confirm, cancel };
}
