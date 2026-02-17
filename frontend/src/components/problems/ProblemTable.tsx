import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Problem } from '@/types/problems'

interface ProblemTableProps {
  problems: Problem[]
  showSolvedStatus?: boolean
  solvedProblemIds?: string[]
}

const difficultyConfig = {
  easy: {
    label: 'Easy',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  medium: {
    label: 'Medium',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
  },
  hard: {
    label: 'Hard',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
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
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">
              Difficulty
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">
              Tags
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell w-24">
              Points
            </th>
            {showSolvedStatus && (
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                Status
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {problems.map((problem, index) => {
            const isSolved = solvedProblemIds.includes(problem.id)
            const config = difficultyConfig[problem.difficulty]

            return (
              <tr
                key={problem.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                  {index + 1}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/problems/${problem.id}`}
                    className="text-sm font-medium text-primary hover:text-primary-hover hover:underline"
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
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                    {problem.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        +{problem.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-400 hidden sm:table-cell">
                  {problem.points}
                </td>
                {showSolvedStatus && (
                  <td className="px-4 py-3 text-center">
                    {isSolved ? (
                      <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-300 dark:text-slate-600">
                        radio_button_unchecked
                      </span>
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