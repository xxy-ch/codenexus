import type { FeatureFlagStatus } from '../types';

export function FeatureFlagsPanel({ flags }: { flags: FeatureFlagStatus[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Feature Flags</h2>

      {flags.length === 0 ? (
        <p className="text-xs text-zinc-600">No feature flags configured</p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.slug}
              className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
            >
              <div>
                <span className="text-xs font-medium text-zinc-200">{flag.name}</span>
                <span className="ml-2 font-mono text-[10px] text-zinc-600">{flag.slug}</span>
              </div>
              <div className="flex items-center gap-3">
                {flag.override_count > 0 && (
                  <span className="text-[10px] text-amber-500">
                    {flag.override_count} override{flag.override_count > 1 ? 's' : ''}
                  </span>
                )}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    flag.default_enabled
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {flag.default_enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
