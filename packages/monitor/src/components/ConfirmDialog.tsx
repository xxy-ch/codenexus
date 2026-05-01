import { useState } from 'react';
import type { ControlTarget, ControlAction } from '../types';

interface ConfirmDialogProps {
  /** Action details */
  target: ControlTarget;
  action: ControlAction;
  /** Confirmation token received from step 1 (null = step 1 pending) */
  token: string | null;
  /** Is a request in flight? */
  submitting: boolean;
  /** Error message to display */
  error: string | null;
  /** Callback with operator name — triggers step 1 (create) or step 2 (confirm) */
  onConfirm: (operator: string) => void;
  /** Cancel the flow */
  onCancel: () => void;
}

const ACTION_COLORS: Record<ControlAction, string> = {
  pause: 'text-amber-400',
  resume: 'text-emerald-400',
  restart: 'text-sky-400',
};

export function ConfirmDialog({
  target,
  action,
  token,
  submitting,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [operator, setOperator] = useState('');
  const step = token ? 2 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <h3 className="mb-1 text-sm font-semibold text-zinc-200">
          Confirm Control Action
        </h3>
        <p className="mb-4 text-xs text-zinc-500">
          Step {step} of 2 —{' '}
          {step === 1
            ? 'Create pending signal'
            : 'Confirm with token'}
        </p>

        {/* Action details */}
        <div className="mb-4 rounded-lg bg-zinc-800/80 px-4 py-3">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-mono text-zinc-300">{target}</span>
            <span className="text-zinc-600">/</span>
            <span className={`font-semibold capitalize ${ACTION_COLORS[action]}`}>
              {action}
            </span>
          </div>
          {token && (
            <div className="mt-2 text-[10px] text-zinc-600">
              Token: <code className="text-amber-500">{token}</code>
            </div>
          )}
        </div>

        {/* Operator input */}
        <label className="mb-4 block">
          <span className="mb-1 block text-xs text-zinc-400">Operator Name</span>
          <input
            type="text"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500"
            autoFocus
          />
        </label>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(operator.trim() || 'dashboard-user')}
            disabled={submitting}
            className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting
              ? 'Submitting…'
              : step === 1
                ? 'Create Signal'
                : 'Confirm Signal'}
          </button>
        </div>
      </div>
    </div>
  );
}
