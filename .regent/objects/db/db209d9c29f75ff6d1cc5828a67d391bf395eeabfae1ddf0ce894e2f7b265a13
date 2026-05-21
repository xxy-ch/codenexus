import type { ConnectionState } from '../types';

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting…',
};

const COLORS: Record<ConnectionState, string> = {
  connecting: 'bg-yellow-500',
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
  reconnecting: 'bg-yellow-500',
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-2 w-2 rounded-full ${COLORS[state]}`} />
      <span className="text-xs text-zinc-400">{LABELS[state]}</span>
    </div>
  );
}
