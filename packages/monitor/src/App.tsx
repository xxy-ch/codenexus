import { useSnapshot } from './hooks/useSnapshot';
import { HeaderBar } from './components/HeaderBar';
import { ServiceStatusGrid } from './components/ServiceStatusGrid';
import { StreamBacklogTable } from './components/StreamBacklogTable';
import { AnalysisMetricsPanel } from './components/AnalysisMetricsPanel';
import { FeatureFlagsPanel } from './components/FeatureFlagsPanel';
import { ControlMatrix } from './components/ControlMatrix';
import { AuditLogPanel } from './components/AuditLogPanel';

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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">
      {/* Header */}
      <HeaderBar
        serverUrl={serverUrl}
        wsState={wsState}
        lastSnapshotTime={snapshot?.timestamp ?? null}
      />

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

        {/* Dashboard grid */}
        {snapshot && (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Services (left) + Analysis metrics (right) */}
            <ServiceStatusGrid services={snapshot.services} />
            <AnalysisMetricsPanel metrics={snapshot.analysis_metrics} />

            {/* Control matrix — full width */}
            <div className="lg:col-span-2">
              <ControlMatrix serverUrl={serverUrl} />
            </div>

            {/* Feature flags + Streams */}
            <FeatureFlagsPanel flags={snapshot.feature_flags} />
            <StreamBacklogTable streams={snapshot.streams} />

            {/* Audit log — full width */}
            <div className="lg:col-span-2">
              <AuditLogPanel serverUrl={serverUrl} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
