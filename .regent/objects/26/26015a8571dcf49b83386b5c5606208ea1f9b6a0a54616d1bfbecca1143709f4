import type { AnalysisMetrics } from '../types';

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-lg font-semibold ${accent ? 'text-emerald-400' : 'text-zinc-200'}`}>
        {value}
      </div>
    </div>
  );
}

export function AnalysisMetricsPanel({ metrics }: { metrics: AnalysisMetrics }) {
  const totalJobs = metrics.pending + metrics.processing + metrics.completed + metrics.failed;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">AI Analysis Metrics</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Pending" value={metrics.pending} />
        <Stat label="Processing" value={metrics.processing} />
        <Stat label="Completed" value={metrics.completed} accent />
        <Stat label="Failed" value={metrics.failed} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Prompt Tokens" value={metrics.total_prompt_tokens.toLocaleString()} />
        <Stat label="Completion Tokens" value={metrics.total_completion_tokens.toLocaleString()} />
        <Stat label="Avg Latency" value={`${Math.round(metrics.avg_latency_ms)}ms`} />
      </div>

      {/* Simple bar */}
      {totalJobs > 0 && (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="bg-zinc-500"
            style={{ width: `${(metrics.pending / totalJobs) * 100}%` }}
          />
          <div
            className="bg-yellow-500"
            style={{ width: `${(metrics.processing / totalJobs) * 100}%` }}
          />
          <div
            className="bg-emerald-500"
            style={{ width: `${(metrics.completed / totalJobs) * 100}%` }}
          />
          <div
            className="bg-red-500"
            style={{ width: `${(metrics.failed / totalJobs) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
