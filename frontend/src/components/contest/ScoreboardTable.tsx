import type { ScoreboardEntry } from '@/services/scoreboard'

interface ScoreboardTableProps {
  entries: ScoreboardEntry[]
}

function getProblemColumns(entries: ScoreboardEntry[]): Array<{ id: number; title: string }> {
  const byId = new Map<number, string>()

  entries.forEach((entry) => {
    entry.submissions.forEach((submission) => {
      if (!byId.has(submission.problem_id)) {
        byId.set(submission.problem_id, submission.problem_title)
      }
    })
  })

  return [...byId.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, title]) => ({ id, title }))
}

export function ScoreboardTable({ entries }: ScoreboardTableProps) {
  const problemColumns = getProblemColumns(entries)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">排名</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">用户</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">解题数</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">总分</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">罚时</th>
            {problemColumns.map((column, index) => (
              <th
                key={column.id}
                className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase"
                title={column.title}
              >
                {String.fromCharCode(65 + index)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map((entry, index) => {
            const submissionMap = new Map(
              entry.submissions.map((submission) => [submission.problem_id, submission])
            )

            return (
              <tr key={entry.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                  #{index + 1}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                  {entry.username}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                  {entry.solved_count}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                  {entry.score}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-700 dark:text-slate-300">
                  {entry.penalty}
                </td>
                {problemColumns.map((column) => {
                  const sub = submissionMap.get(column.id)
                  return (
                    <td key={`${entry.user_id}-${column.id}`} className="px-4 py-3 text-center">
                      {sub ? (
                        <span className="text-xs text-slate-700 dark:text-slate-300">
                          {sub.score > 0 ? `+${sub.attempts}` : `-${sub.attempts}`}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5 + problemColumns.length}>
                暂无排行榜数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

