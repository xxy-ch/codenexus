import { ConnectionBadge } from './ConnectionBadge';
import type { ConnectionState } from '../types';

interface HeaderBarProps {
  serverUrl: string;
  wsState: ConnectionState;
  lastSnapshotTime: string | null;
}

export function HeaderBar({ serverUrl, wsState, lastSnapshotTime }: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            CodeNexus Monitor
          </h1>
          <span className="hidden text-xs text-zinc-600 sm:inline">
            {serverUrl.replace(/^https?:\/\//, '')}
          </span>
          {lastSnapshotTime && (
            <span className="text-xs text-zinc-500">
              {new Date(lastSnapshotTime).toLocaleTimeString()}
            </span>
          )}
        </div>
        <ConnectionBadge state={wsState} />
      </div>
    </header>
  );
}
