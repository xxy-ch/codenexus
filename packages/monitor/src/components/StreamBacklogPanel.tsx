import type { StreamBacklog } from '../types';

export function StreamBacklogPanel({ streams }: { streams: StreamBacklog[] }) {
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
                <th className="pb-2 font-medium">Stream</th>
                <th className="pb-2 font-medium">Consumer Group</th>
                <th className="pb-2 text-right font-medium">Pending</th>
                <th className="pb-2 text-right font-medium">Lag</th>
                <th className="pb-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((s) => (
                <tr key={`${s.stream}-${s.consumer_group}`} className="border-t border-zinc-800">
                  <td className="py-1.5 text-zinc-300">{s.stream}</td>
                  <td className="py-1.5 text-zinc-400">{s.consumer_group}</td>
                  <td className="py-1.5 text-right text-zinc-300">{s.pending}</td>
                  <td className="py-1.5 text-right text-zinc-300">{s.lag}</td>
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
