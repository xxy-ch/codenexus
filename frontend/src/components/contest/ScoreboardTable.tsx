import { cn } from '@/lib/utils'
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

function getRankStyle(rank: number) {
  if (rank === 1) return 'text-amber-500'
  if (rank === 2) return 'text-slate-400'
  if (rank === 3) return 'text-amber-700'
  return 'text-foreground'
}

function getRankBg(rank: number) {
  if (rank === 1) return 'bg-amber-500/5'
  if (rank === 2) return 'bg-slate-400/5'
  if (rank === 3) return 'bg-amber-700/5'
  return ''
}

export function ScoreboardTable({ entries }: ScoreboardTableProps) {
  const problemColumns = getProblemColumns(entries)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px]">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">排名</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">用户</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">解题数</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">总分</th>
            <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">罚时</th>
            {problemColumns.map((column, index) => (
              <th
                key={column.id}
                className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                title={column.title}
              >
                {String.fromCharCode(65 + index)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const rank = index + 1
            const submissionMap = new Map(
              entry.submissions.map((submission) => [submission.problem_id, submission])
            )

            return (
              <tr
                key={entry.user_id}
                className={cn(
                  'border-b border-border transition-colors',
                  rank <= 3
                    ? cn('hover:bg-muted/50', getRankBg(rank))
                    : 'hover:bg-muted/50',
                  rank % 2 === 0 ? 'bg-muted/20' : ''
                )}
              >
                <td className={cn('px-4 py-3 text-sm font-black tabular-nums', getRankStyle(rank))}>
                  #{rank}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">
                  {entry.username}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold tabular-nums text-foreground">
                  {entry.solved_count}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold tabular-nums text-primary">
                  {entry.score}
                </td>
                <td className="px-4 py-3 text-sm text-right tabular-nums text-muted-foreground">
                  {entry.penalty}
                </td>
                {problemColumns.map((column) => {
                  const sub = submissionMap.get(column.id)
                  const isSolved = sub && sub.score > 0
                  return (
                    <td key={`${entry.user_id}-${column.id}`} className="px-4 py-3 text-center">
                      {sub ? (
                        <span className={cn(
                          'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                          isSolved
                            ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]'
                            : 'text-muted-foreground'
                        )}>
                          {isSolved ? `+${sub.attempts}` : `-${sub.attempts}`}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {entries.length === 0 && (
            <tr>
              <td className="px-4 py-12 text-center text-sm text-muted-foreground" colSpan={5 + problemColumns.length}>
                暂无排行榜数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
