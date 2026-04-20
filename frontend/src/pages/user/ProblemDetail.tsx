import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProblem } from '@/hooks/useProblems'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ProblemDetailSkeleton } from '@/components/skeletons/ProblemDetailSkeleton'
import { InlineError } from '@/components/ui/InlineError'

const difficultyConfig = {
  easy: {
    label: 'Easy',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  medium: {
    label: 'Medium',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  hard: {
    label: 'Hard',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800',
  },
}

export function ProblemDetail() {
  const { problemId } = useParams<{ problemId: string }>()
  const navigate = useNavigate()
  const { data: problem, isLoading, error } = useProblem(problemId ?? '')

  const handleSolve = () => {
    navigate(`/problems/${problemId}/solve`)
  }

  if (isLoading) {
    return <ProblemDetailSkeleton />
  }

  if (error || !problem) {
    return (
      <InlineError
        title="题目加载失败"
        message="无法加载题目详情，请稍后重试"
        onRetry={() => window.location.reload()}
      />
    )
  }

  const config = difficultyConfig[problem.difficulty]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {problem.title}
            </h1>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border',
                config.bgColor,
                config.textColor,
                config.borderColor
              )}
            >
              {config.label}
            </span>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">schedule</span>
              <span>{problem.time_limit}ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">memory</span>
              <span>{problem.memory_limit}MB</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-lg">stars</span>
              <span>{problem.points} points</span>
            </div>
          </div>
        </div>

        <Button variant="primary" size="lg" onClick={handleSolve}>
          <span className="material-symbols-outlined mr-2">play_arrow</span>
          Solve Now
        </Button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {problem.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Problem Description */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Description
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>{problem.description}</p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Examples
          </h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {/* Example 1 */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Example 1:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Input:
                </p>
                <code className="text-sm text-slate-800 dark:text-slate-200">
                  nums = [2,7,11,15], target = 9
                </code>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Output:
                </p>
                <code className="text-sm text-slate-800 dark:text-slate-200">
                  [0,1]
                </code>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
              Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
            </p>
          </div>

          {/* Example 2 */}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Example 2:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Input:
                </p>
                <code className="text-sm text-slate-800 dark:text-slate-200">
                  nums = [3,2,4], target = 6
                </code>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Output:
                </p>
                <code className="text-sm text-slate-800 dark:text-slate-200">
                  [1,2]
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Constraints
          </h2>
        </div>
        <div className="px-6 py-4">
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <li>2 ≤ nums.length ≤ 10⁴</li>
            <li>-10⁹ ≤ nums[i] ≤ 10⁹</li>
            <li>-10⁹ ≤ target ≤ 10⁹</li>
            <li>Only one valid answer exists.</li>
          </ul>
        </div>
      </div>

      {/* Hints */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl mt-0.5">
              lightbulb
            </span>
            <div>
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Hint
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Think about using a hash table to store the values you've seen so far.
                For each number, check if the complement (target - number) exists in the hash table.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Link to="/problems">
          <Button variant="outline">
            <span className="material-symbols-outlined mr-2">arrow_back</span>
            Back to Problems
          </Button>
        </Link>
      </div>
    </div>
  )
}
