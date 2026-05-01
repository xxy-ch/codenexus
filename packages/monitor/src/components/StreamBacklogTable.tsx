import { useState, useMemo } from 'react';
import type { StreamBacklog } from '../types';

type SortKey = 'stream' | 'consumer_group' | 'pending' | 'lag' | 'total';
type SortDir = 'asc' | 'desc';

export function StreamBacklogTable({ streams }: { streams: StreamBacklog[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('lag');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const copy = [...streams];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
    return copy;
  }, [streams, sortKey, sortDir]);

  const th = (key: SortKey, label: string, align: string) => (
    <th
      className={`pb-2 font-medium cursor-pointer select-none hover:text-zinc-300 ${align}`}
      onClick={() => toggleSort(key)}
    >
      {label}
      {sortKey === key && (
        <span className="ml-0.5 text-[8px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-300">Stream Backlogs</h2>

      {streams.length === 0 ? (
        <p className="text-xs text-zinc-600">No stream data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-zinc-500">
                {th('stream', 'Stream', 'text-left')}
                {th('consumer_group', 'Consumer Group', 'text-left')}
                {th('pending', 'Pending', 'text-right')}
                {th('lag', 'Lag', 'text-right')}
                {th('total', 'Total', 'text-right')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={`${s.stream}-${s.consumer_group}`} className="border-t border-zinc-800">
                  <td className="py-1.5 text-zinc-300">{s.stream}</td>
                  <td className="py-1.5 text-zinc-400">{s.consumer_group}</td>
                  <td className="py-1.5 text-right text-zinc-300">{s.pending}</td>
                  <td className="py-1.5 text-right">
                    <span className={s.lag > 0 ? 'text-amber-400' : 'text-zinc-300'}>
                      {s.lag}
                    </span>
                  </td>
                  <td className="py-1.5 text-right font-medium text-zinc-200">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
