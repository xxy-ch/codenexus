import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { scoreboardService } from '@/services/scoreboard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingState } from '@/components/ui/LoadingState'
import { EmptyState } from '@/components/ui/EmptyState'
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
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingState message="加载排行榜中..." />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">
        <EmptyState
          title="排行榜加载失败"
          description="当前无法读取实时榜单数据。"
          action={{ label: '重试', onClick: () => refetch() }}
        />
      </div>
    )
  }

  const leader = data[0]
  const totalSolved = data.reduce((sum, entry) => sum + entry.solved_count, 0)
  const totalScore = data.reduce((sum, entry) => sum + entry.score, 0)
  const averageSolved = data.length > 0 ? (totalSolved / data.length).toFixed(1) : '0.0'

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            竞赛中心 / 实时榜单
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            实时榜单
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
            按参考稿收成控制台式榜单工作区，聚合榜首状态、刷新节奏和实时排名池，榜单每 15 秒自动轮询一次。
          </p>
        </div>
        <Link to={contestId ? `/contests/${contestId}` : '/contests'}>
          <Button variant="outline">返回竞赛</Button>
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.95fr]">
        {/* Hero Card */}
        <Card variant="default" className="overflow-hidden bg-gradient-to-br from-primary to-primary-container px-6 py-6 text-on-primary">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/70">竞赛榜单台</p>
              <h2 className="mt-3 font-headline text-3xl font-extrabold text-on-primary md:text-4xl">榜单概览</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-primary/80">
                榜首、均值和积分池在同一屏直接读取，不再退回普通表格页。
              </p>
            </div>
            <div className="grid gap-3 rounded-2xl border border-on-primary/20 bg-on-primary/10 p-4 text-sm text-on-primary/80">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/60">当前榜首</p>
                <p className="mt-1 text-xl font-semibold text-on-primary">{leader?.username ?? '暂无数据'}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/56">累计积分</p>
                  <p className="mt-1 text-lg font-semibold text-on-primary">{totalScore}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/56">平均解题</p>
                  <p className="mt-1 text-lg font-semibold text-on-primary">{averageSolved}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-4 xl:grid-cols-1">
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">刷新窗口</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">15s</p>
            <p className="mt-2 text-sm text-on-surface-variant">自动轮询已开启</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">榜单来源</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">实时接口</p>
            <p className="mt-2 text-sm text-on-surface-variant">不使用前端兜底榜单</p>
          </Card>
          <Card variant="surface" className="p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">计分模式</p>
            <p className="mt-4 font-headline text-2xl font-extrabold text-on-surface">实时视图</p>
            <p className="mt-2 text-sm text-on-surface-variant">当前席位 {data.length} 人</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.35fr]">
        {/* Sidebar */}
        <Card variant="surface" className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">实时榜单</p>
          <h3 className="mt-3 font-headline text-2xl font-extrabold text-on-surface">席位观察</h3>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            榜单源自真实排名接口，适合直接查看名次、罚时、解题量和题目分布。
          </p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">榜首用户</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">{leader?.username ?? '暂无数据'}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">解题总量</p>
              <p className="mt-2 text-lg font-semibold text-on-surface">{totalSolved}</p>
            </div>
          </div>
        </Card>

        {/* Scoreboard Table */}
        <section className="overflow-hidden rounded-3xl border border-outline-variant bg-surface shadow-sm">
          <div className="border-b border-outline-variant/10 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">实时排名池</p>
            <h3 className="mt-2 font-headline text-2xl font-extrabold text-on-surface">排名明细</h3>
          </div>
          <ScoreboardTable entries={data} />
        </section>
      </div>
    </div>
  )
}
