import type { ServiceStatus } from '../types';

interface ServiceCardProps {
  service: ServiceStatus;
}

function breakerColor(state: string): string {
  if (state === 'Closed') return 'bg-emerald-500';
  if (state === 'Open') return 'bg-red-500';
  return 'bg-yellow-500'; // HalfOpen
}

function healthColor(service: ServiceStatus): string {
  const redisOk = service.redis_breaker_state === 'Closed';
  const apiOk = service.api_breaker_state === 'Closed';
  if (redisOk && apiOk) return 'border-emerald-900/40';
  if (!redisOk || !apiOk) return 'border-red-900/40';
  return 'border-yellow-900/40';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 1000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <div
      className={`rounded-xl border bg-zinc-900/50 p-3 ${healthColor(service)}`}
    >
      {/* Header: worker id + last seen */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-200">
          {service.worker_id}
        </span>
        <span className="text-[10px] text-zinc-600">
          {relativeTime(service.last_seen)}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div>
          <div className="text-lg font-semibold text-zinc-200">
            {service.active_judgements}
          </div>
          <div className="text-[10px] text-zinc-500">Active</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-200">
            {service.total_processed}
          </div>
          <div className="text-[10px] text-zinc-500">Total</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-zinc-200">
            {Math.round(service.avg_wait_ms)}
          </div>
          <div className="text-[10px] text-zinc-500">Avg ms</div>
        </div>
      </div>

      {/* Breaker states */}
      <div className="mt-2 flex items-center gap-3 border-t border-zinc-800 pt-2">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${breakerColor(service.redis_breaker_state)}`} />
          <span className="text-[10px] text-zinc-500">Redis: {service.redis_breaker_state}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${breakerColor(service.api_breaker_state)}`} />
          <span className="text-[10px] text-zinc-500">API: {service.api_breaker_state}</span>
        </div>
      </div>
    </div>
  );
}
