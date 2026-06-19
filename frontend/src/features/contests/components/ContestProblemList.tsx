import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/utils'

interface ContestProblem {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  points: number
  accepted_count: number
  submission_count: number
}

const DIFFICULTY_CONFIG = {
  easy: { label: '简单', bgColor: 'bg-[#3ecf8e]/10', textColor: 'text-[#3ecf8e]', borderColor: 'border-[#3ecf8e]/20' },
  medium: { label: '中等', bgColor: 'bg-difficulty-medium/10', textColor: 'text-difficulty-medium', borderColor: 'border-difficulty-medium/20' },
  hard: { label: '困难', bgColor: 'bg-difficulty-hard/10', textColor: 'text-difficulty-hard', borderColor: 'border-difficulty-hard/20' },
}

interface ContestProblemListProps {
  problems: ContestProblem[]
  contestId: string
}

export function ContestProblemList({ problems, contestId }: ContestProblemListProps) {
  const getPassRate = (accepted: number, submissions: number) => {
    if (submissions === 0) return '0%'
    return `${Math.round((accepted / submissions) * 100)}%`
  }

  return (
    <div className="surface-card overflow-hidden backdrop-blur-xl">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/30">
        <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">竞赛题目</h2>
      </div>
      <div className="divide-y divide-border/60">
        {problems.map((problem, index) => {
          const cfg = DIFFICULTY_CONFIG[problem.difficulty]
          const passRate = getPassRate(problem.accepted_count, problem.submission_count)

          return (
            <Link
              key={problem.id}
              to={`/contests/${contestId}/problems/${problem.id}/solve`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <span className={cn('flex items-center justify-center w-9 h-9 rounded-xl text-sm font-extrabold tabular-nums border', cfg.bgColor, cfg.textColor, cfg.borderColor)}>
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{problem.title}</h3>
                  <div className="flex items-center gap-3">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[13px] font-semibold border', cfg.bgColor, cfg.textColor, cfg.borderColor)}>
                      {cfg.label}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[13px] font-semibold text-muted-foreground">
                      {problem.category || '默认'}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">{problem.points} 分</span>
                    <span className="text-[13px] font-semibold tabular-nums text-muted-foreground">通过率 {passRate}</span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 transition-transform group-hover:translate-x-[-4px]">
                <p className="text-sm font-extrabold tabular-nums text-foreground">
                  {problem.accepted_count} <span className="text-muted-foreground font-normal">/ {problem.submission_count}</span>
                </p>
                <p className="text-[13px] text-muted-foreground uppercase tracking-wider font-semibold">通过 / 提交</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
