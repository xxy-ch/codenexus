import { ALLOWED_TARGETS, type ControlTarget, type ControlAction } from '../types';

interface ControlMatrixProps {
  onAction: (target: ControlTarget, action: ControlAction) => void;
  disabled?: boolean;
}

const ACTIONS: ControlAction[] = ['pause', 'resume', 'restart'];

const ACTION_STYLES: Record<ControlAction, string> = {
  pause: 'bg-amber-700/60 hover:bg-amber-600/60 text-amber-200',
  resume: 'bg-emerald-700/60 hover:bg-emerald-600/60 text-emerald-200',
  restart: 'bg-sky-700/60 hover:bg-sky-600/60 text-sky-200',
};

export function ControlMatrix({ onAction, disabled }: ControlMatrixProps) {
  return (
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
                {ACTIONS.map((action) => (
                  <td key={action} className="py-2 text-center">
                    <button
                      onClick={() => onAction(target as ControlTarget, action)}
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
  );
}
