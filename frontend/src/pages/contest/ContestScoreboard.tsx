import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Activity, ChevronRight, RefreshCw, TimerReset, Trophy } from 'lucide-react'
import { scoreboardService } from '@/services/scoreboard'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'
import { InlineError } from '@/components/ui/InlineError'
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
    return <TableSkeleton rows={10} columns={6} />
  }

  if (error || !data) {
    return (
      <InlineError
        title="排行榜加载失败"
        message="无法加载竞赛排行榜数据，请稍后重试"
        onRetry={() => refetch()}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero Header — ClickHouse high-energy scoreboard */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[#3ecf8e]/5" />
        <div className="h-1 bg-gradient-to-r from-[#3ecf8e] via-primary to-amber-500" />
        <div className="relative px-6 py-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>竞赛</span>
                <ChevronRight className="h-4 w-4" />
                <span className="font-semibold text-foreground">实时榜单</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  CodeNexus 实时榜单
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground font-normal">
                  实时竞赛排名，每 15 秒自动刷新，帮助选手和教师同步掌握赛况。
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 px-4 py-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3ecf8e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3ecf8e]"></span>
                </span>
                <span className="text-xs font-bold text-[#3ecf8e] uppercase tracking-widest">Live</span>
              </div>
              <div className="rounded-full border border-border bg-background px-4 py-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-widest">15s 刷新</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status indicators — prominent, high-energy */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#3ecf8e]/10 p-2">
              <RefreshCw className="h-4 w-4 text-[#3ecf8e]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">自动刷新</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">已启用</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <TimerReset className="h-4 w-4 text-difficulty-medium" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">刷新间隔</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">15 秒</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">数据来源</p>
              <p className="mt-0.5 text-sm font-bold text-foreground">竞赛提交</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-foreground p-1.5 text-background">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">实时竞赛榜单</p>
            <p className="text-[11px] text-muted-foreground">每 15 秒轮询更新。</p>
          </div>
        </div>
        <Link
          to={contestId ? `/contests/${contestId}` : '/contests'}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors"
        >
          返回竞赛
        </Link>
      </div>

      {/* Scoreboard Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <ScoreboardTable entries={data} />
      </div>
    </div>
  )
}
