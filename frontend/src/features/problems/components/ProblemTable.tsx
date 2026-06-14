import { Link } from 'react-router-dom'
import { CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Problem } from '@/features/problems/types/problems'

interface ProblemTableProps {
  problems: Problem[]
  showSolvedStatus?: boolean
  solvedProblemIds?: string[]
}

const difficultyConfig = {
  easy: {
    label: '简单',
    bgColor: 'bg-difficulty-easy/10',
    textColor: 'text-difficulty-easy',
  },
  medium: {
    label: '中等',
    bgColor: 'bg-difficulty-medium/10',
    textColor: 'text-difficulty-medium',
  },
  hard: {
    label: '困难',
    bgColor: 'bg-difficulty-hard/10',
    textColor: 'text-difficulty-hard',
  },
}

export function ProblemTable({
  problems,
  showSolvedStatus = false,
  solvedProblemIds = [],
}: ProblemTableProps) {
  const getDifficultyStyles = (difficulty: Problem['difficulty']) => {
    const config = difficultyConfig[difficulty]
    return cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      config.bgColor,
      config.textColor
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest w-16">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              标题
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest w-24">
              难度
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-widest hidden md:table-cell">
              标签
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-widest hidden sm:table-cell w-24">
              分值
            </th>
            {showSolvedStatus && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest w-20">
                状态
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {problems.map((problem, index) => {
            const isSolved = solvedProblemIds.includes(problem.id)
            const config = difficultyConfig[problem.difficulty]

            return (
              <tr
                key={problem.id}
                className="hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/problems/${problem.id}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {problem.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={getDifficultyStyles(problem.difficulty)}>
                    {config.label}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {problem.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {problem.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                        +{problem.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                  {problem.points}
                </td>
                {showSolvedStatus && (
                  <td className="px-4 py-3 text-center">
                    {isSolved ? (
                      <CheckCircle className="w-5 h-5 text-status-accepted mx-auto" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
