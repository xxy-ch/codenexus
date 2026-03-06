import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { scoreboardService } from '@/services/scoreboard'
import { Loading } from '@/components/ui/Loading'
import { ScoreboardTable } from '@/components/contest/ScoreboardTable'

export function ContestScoreboard() {
  const { contestId } = useParams<{ contestId: string }>()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contest-scoreboard', contestId],
    queryFn: () => scoreboardService.getContestScoreboard(contestId!),
    enabled: !!contestId,
    refetchInterval: 15000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading message="加载排行榜..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
          error
        </span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          排行榜加载失败
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-primary text-white"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">竞赛实时榜单</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            每 15 秒自动刷新一次
          </p>
        </div>
        <Link
          to={contestId ? `/contests/${contestId}` : '/contests'}
          className="px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-700"
        >
          返回竞赛
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <ScoreboardTable entries={data} />
      </div>
    </div>
  )
}
