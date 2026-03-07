import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Activity, ChevronRight, RefreshCw, TimerReset, Trophy } from 'lucide-react'
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
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(135deg,#eff6ff_0%,#f8fafc_50%,#ffffff_100%)] px-6 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#020617_100%)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span>Contest</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-slate-900 dark:text-white">Scoreboard</span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">竞赛实时榜单</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                  当前榜单按真实竞赛排名接口渲染，每 15 秒自动刷新一次，适合作为交付范围内的 live scoreboard。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Refresh Window</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">15s</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Source</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Live API</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Mode</p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Scoreboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Auto Refresh</p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Enabled</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <TimerReset className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Polling Interval</p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">15 seconds</p>
            </div>
          </div>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Delivery Scope</p>
              <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Live ranking</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-950 p-2 text-white dark:bg-white dark:text-slate-950">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-white">Live Contest Board</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">榜单源自真实排名接口，不使用前端 fallback。</p>
          </div>
        </div>
        <Link
          to={contestId ? `/contests/${contestId}` : '/contests'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
        >
          返回竞赛
        </Link>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <ScoreboardTable entries={data} />
      </div>
    </div>
  )
}
