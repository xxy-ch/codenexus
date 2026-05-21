import type { ServiceStatus } from '../types';
import { ServiceCard } from './ServiceCard';

export function ServiceStatusGrid({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Service Status</h2>

      {services.length === 0 ? (
        <p className="text-xs text-zinc-600">No services reporting</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((svc) => (
            <ServiceCard key={svc.worker_id} service={svc} />
          ))}
        </div>
      )}
    </div>
  );
}
