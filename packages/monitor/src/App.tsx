import { useSnapshot } from './hooks/useSnapshot';
import { useTwoStepConfirm } from './hooks/useTwoStepConfirm';
import { ConnectionBadge } from './components/ConnectionBadge';
import { ServiceStatusPanel } from './components/ServiceStatusPanel';
import { StreamBacklogPanel } from './components/StreamBacklogPanel';
import { AnalysisMetricsPanel } from './components/AnalysisMetricsPanel';
import { FeatureFlagsPanel } from './components/FeatureFlagsPanel';
import { ControlMatrix } from './components/ControlMatrix';

/**
 * Detect the remote monitor-server URL from the current browser location.
 *
 * In production, the dashboard is served by the local proxy server (bin/monitor.js)
 * which forwards /api/* to the remote server. So we just use the current origin.
 */
function getServerUrl(): string {
  return window.location.origin;
}

export default function App() {
  const serverUrl = getServerUrl();
  const { snapshot, loading, error, wsState } = useSnapshot({ serverUrl });
  const control = useTwoStepConfirm({
    serverUrl,
    onComplete: (target, action) => {
      console.log(`[monitor] control signal confirmed: ${action} ${target}`);
    },
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold tracking-tight">
              CodeNexus Monitor
            </h1>
            {snapshot && (
              <span className="text-xs text-zinc-500">
                {new Date(snapshot.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <ConnectionBadge state={wsState} />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Loading state */}
        {loading && !snapshot && (
          <div className="flex h-64 items-center justify-center">
            <div className="text-sm text-zinc-500">Loading monitoring data…</div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Two-step confirmation dialog */}
        {control.pending && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/50 px-4 py-3">
            <p className="text-sm text-amber-200">
              Confirm <strong>{control.pending.action}</strong> on{' '}
              <strong>{control.pending.target}</strong>?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={control.confirm}
                disabled={control.submitting}
                className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {control.submitting ? 'Confirming…' : 'Confirm'}
              </button>
              <button
                onClick={control.cancel}
                disabled={control.submitting}
                className="rounded bg-zinc-700 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Control error */}
        {control.error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            <strong>Control error:</strong> {control.error}
          </div>
        )}

        {/* Dashboard grid */}
        {snapshot && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ServiceStatusPanel services={snapshot.services} />
            <StreamBacklogPanel streams={snapshot.streams} />
            <AnalysisMetricsPanel metrics={snapshot.analysis_metrics} />
            <FeatureFlagsPanel flags={snapshot.feature_flags} />
            <div className="lg:col-span-2">
              <ControlMatrix
                onAction={(target, action) =>
                  control.initiate(target, action, 'dashboard-user')
                }
                disabled={control.submitting || !!control.pending}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
