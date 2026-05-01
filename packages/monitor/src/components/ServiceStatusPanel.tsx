import type { ServiceStatus } from '../types';

export function ServiceStatusPanel({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Service Status</h2>

      {services.length === 0 ? (
        <p className="text-xs text-zinc-600">No services reporting</p>
      ) : (
        <div className="space-y-2">
          {services.map((svc) => (
            <div
              key={svc.worker_id}
              className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    svc.redis_breaker_state === 'Closed' && svc.api_breaker_state === 'Closed'
                      ? 'bg-emerald-500'
                      : 'bg-yellow-500'
                  }`}
                />
                <span className="text-xs font-medium text-zinc-200">{svc.worker_id}</span>
              </div>
              <div className="flex gap-4 text-xs text-zinc-500">
                <span>active: {svc.active_judgements}</span>
                <span>total: {svc.total_processed}</span>
                <span>wait: {svc.avg_wait_ms}ms</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
