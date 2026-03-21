import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { scoreboardService } from '@/services/scoreboard'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/page/EmptyState'
import { PageHeader } from '@/components/page/PageHeader'
import { StatCard } from '@/components/page/StatCard'
import { SurfaceCard } from '@/components/page/SurfaceCard'
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loading message="加载排行榜..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        title="排行榜加载失败"
        description="当前无法读取实时榜单数据。"
        action={
          <Button variant="primary" onClick={() => refetch()}>
            重试
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contest Scoreboard"
        breadcrumb={['Contest', 'Scoreboard']}
        title="竞赛实时榜单"
        description="聚焦排行和刷新状态，不增加无关壳层。榜单每 15 秒自动轮询一次。"
        actions={
          <Link to={contestId ? `/contests/${contestId}` : '/contests'}>
            <Button variant="outline">返回竞赛</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Refresh Window" value="15s" helper="自动轮询已开启" />
        <StatCard label="Source" value="Live API" helper="不使用前端兜底榜单" />
        <StatCard label="Mode" value="Scoreboard" helper="当前为实时视图" />
      </div>

      <SurfaceCard tone="muted" className="p-4">
        <p className="text-sm font-semibold text-slate-950">Live Contest Board</p>
        <p className="mt-1 text-sm text-slate-600">榜单源自真实排名接口，适合直接查看名次、罚时和解题情况。</p>
      </SurfaceCard>

      <section className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-[rgba(255,255,255,0.92)] shadow-[0_16px_36px_rgba(15,23,42,0.07)] backdrop-blur-sm">
        <ScoreboardTable entries={data} />
      </section>
    </div>
  )
}
