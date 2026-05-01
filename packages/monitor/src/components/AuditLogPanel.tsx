import { useState, useEffect, useCallback } from 'react';
import type { AuditLogEntry, AuditLogResponse } from '../types';
import { ALLOWED_TARGETS } from '../types';
import { useControlApi } from '../hooks/useControlApi';

interface AuditLogPanelProps {
  serverUrl: string;
}

function resultBadge(result: 'success' | 'failure'): React.ReactNode {
  if (result === 'success')
    return <span className="rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-400">ok</span>;
  return <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[10px] text-red-400">fail</span>;
}

export function AuditLogPanel({ serverUrl }: AuditLogPanelProps) {
  const { getAuditLog } = useControlApi({ serverUrl });
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const resp: AuditLogResponse = await getAuditLog({
        limit: 50,
        target: filter || undefined,
      });
      setEntries(resp.entries);
      setCount(resp.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getAuditLog, filter]);

  useEffect(() => {
    fetchLog();
    const timer = setInterval(fetchLog, 15000);
    return () => clearInterval(timer);
  }, [fetchLog]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">
          Audit Log
          <span className="ml-2 text-[10px] font-normal text-zinc-600">
            {count} entries
          </span>
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] text-zinc-300 outline-none"
        >
          <option value="">All targets</option>
          {ALLOWED_TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-2 rounded border border-red-900/50 bg-red-950/50 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <p className="text-xs text-zinc-600">Loading audit log…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-zinc-600">No audit entries</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500">
                <th className="pb-2 font-medium">Time</th>
                <th className="pb-2 font-medium">Target</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Operator</th>
                <th className="pb-2 font-medium">Result</th>
                <th className="pb-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-zinc-800">
                  <td className="py-1.5 text-zinc-500">
                    {new Date(entry.created_at).toLocaleTimeString()}
                  </td>
                  <td className="py-1.5 font-mono text-zinc-300">{entry.target}</td>
                  <td className="py-1.5 capitalize text-zinc-400">{entry.action}</td>
                  <td className="py-1.5 text-zinc-400">{entry.operator}</td>
                  <td className="py-1.5">{resultBadge(entry.result)}</td>
                  <td className="py-1.5 text-zinc-600">
                    {entry.error_message ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
