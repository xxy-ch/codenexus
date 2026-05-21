import { useState, useEffect, useCallback } from 'react';
import { ALLOWED_TARGETS, type ControlTarget, type ControlAction, type SignalStatusResponse } from '../types';
import { useControlApi } from '../hooks/useControlApi';
import { ConfirmDialog } from './ConfirmDialog';

interface ControlMatrixProps {
  serverUrl: string;
  disabled?: boolean;
}

const ACTIONS: ControlAction[] = ['pause', 'resume', 'restart'];

const ACTION_STYLES: Record<ControlAction, string> = {
  pause: 'bg-amber-700/60 hover:bg-amber-600/60 text-amber-200',
  resume: 'bg-emerald-700/60 hover:bg-emerald-600/60 text-emerald-200',
  restart: 'bg-sky-700/60 hover:bg-sky-600/60 text-sky-200',
};

function signalBadge(signal: SignalStatusResponse['signal']): React.ReactNode {
  if (!signal) return <span className="text-[10px] text-zinc-600">idle</span>;
  if (signal.confirmed) return <span className="text-[10px] text-emerald-400">active</span>;
  return <span className="text-[10px] text-amber-400">pending</span>;
}

export function ControlMatrix({ serverUrl, disabled }: ControlMatrixProps) {
  const { createSignal, confirmSignal, getStatus } = useControlApi({ serverUrl });
  const [statuses, setStatuses] = useState<Record<string, SignalStatusResponse>>({});
  const [dialog, setDialog] = useState<{
    target: ControlTarget;
    action: ControlAction;
    step: 1 | 2;
    token: string | null;
    submitting: boolean;
    error: string | null;
  } | null>(null);

  // Fetch signal statuses for all targets
  const refreshStatuses = useCallback(async () => {
    const results: Record<string, SignalStatusResponse> = {};
    await Promise.all(
      ALLOWED_TARGETS.map(async (target) => {
        try {
          results[target] = await getStatus(target);
        } catch {
          results[target] = { target, signal: null };
        }
      }),
    );
    setStatuses(results);
  }, [getStatus]);

  useEffect(() => {
    refreshStatuses();
    const timer = setInterval(refreshStatuses, 10000);
    return () => clearInterval(timer);
  }, [refreshStatuses]);

  const openDialog = (target: ControlTarget, action: ControlAction) => {
    setDialog({ target, action, step: 1, token: null, submitting: false, error: null });
  };

  const handleConfirm = async (operator: string) => {
    if (!dialog) return;

    if (dialog.step === 1) {
      // Step 1: create signal
      setDialog({ ...dialog, submitting: true, error: null });
      try {
        const resp = await createSignal(dialog.target, dialog.action, operator);
        setDialog({ ...dialog, step: 2, token: resp.confirmation_token, submitting: false });
      } catch (err) {
        setDialog({
          ...dialog,
          submitting: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    } else if (dialog.token) {
      // Step 2: confirm signal
      setDialog({ ...dialog, submitting: true, error: null });
      try {
        await confirmSignal(dialog.target, dialog.action, dialog.token);
        setDialog(null);
        refreshStatuses();
      } catch (err) {
        setDialog({
          ...dialog,
          submitting: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  };

  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-300">
          Process Control Matrix
          <span className="ml-2 text-[10px] font-normal text-zinc-600">
            two-step confirmation required
          </span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="pb-2 font-medium">Service</th>
                <th className="pb-2 font-medium">Signal</th>
                {ACTIONS.map((a) => (
                  <th key={a} className="pb-2 text-center font-medium capitalize">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALLOWED_TARGETS.map((target) => (
                <tr key={target} className="border-t border-zinc-800">
                  <td className="py-2 font-mono text-zinc-300">{target}</td>
                  <td className="py-2">{signalBadge(statuses[target]?.signal ?? null)}</td>
                  {ACTIONS.map((action) => (
                    <td key={action} className="py-2 text-center">
                      <button
                        onClick={() => openDialog(target as ControlTarget, action)}
                        disabled={disabled}
                        className={`rounded px-3 py-1 text-[10px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${ACTION_STYLES[action]}`}
                      >
                        {action}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Dialog Modal */}
      {dialog && (
        <ConfirmDialog
          target={dialog.target}
          action={dialog.action}
          token={dialog.token}
          submitting={dialog.submitting}
          error={dialog.error}
          onConfirm={handleConfirm}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  );
}
